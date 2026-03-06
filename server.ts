import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Importação dinâmica do Vite para não pesar no bundle da Vercel
let createViteServer: any = null;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  import('vite').then(m => {
    createViteServer = m.createServer;
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- REIMPLEMENTAÇÃO LIMPA MERCADO PAGO ---
app.post('/api/checkout/mercadopago', async (req, res) => {
  try {
    console.log("[MP] Iniciando criação de preferência...");
    const { items, payer, external_reference, accessToken } = req.body;
    
    console.log("[MP] Dados recebidos:", { 
      itemsCount: items?.length, 
      payerEmail: payer?.email, 
      external_reference,
      hasToken: !!accessToken 
    });

    if (!accessToken) {
      console.error("[MP] Erro: Access Token ausente.");
      return res.status(400).json({ error: 'Access Token é obrigatório' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Itens do carrinho não enviados' });
    }

    // Inicializa o cliente com o token recebido
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const preference = new Preference(client);

    // Determina a URL base dinamicamente
    const getHeader = (name: string) => {
      const val = req.headers[name];
      return Array.isArray(val) ? val[0] : val;
    };
    
    const protocol = getHeader('x-forwarded-proto') || req.protocol;
    const host = getHeader('x-forwarded-host') || req.get('host');
    const origin = req.get('origin') || `${protocol}://${host}`;
    
    const baseUrl = process.env.APP_URL || origin;
    console.log("[MP] Base URL para retorno:", baseUrl);

    const body = {
      items: items.map((item: any) => {
        const price = Number(item.unit_price);
        if (isNaN(price)) {
          throw new Error(`Preço inválido para o item ${item.title}: ${item.unit_price}`);
        }
        return {
          id: String(item.id),
          title: String(item.title).substring(0, 250), // Limite de caracteres do MP
          quantity: Math.max(1, Number(item.quantity)),
          unit_price: price,
          currency_id: 'BRL',
        };
      }),
      payer: {
        email: payer?.email || 'cliente@email.com',
        name: payer?.name || 'Cliente',
      },
      external_reference: String(external_reference),
      notification_url: `${baseUrl}/api/webhooks/mercadopago?token=${accessToken}`,
      back_urls: {
        success: `${baseUrl}/`,
        failure: `${baseUrl}/`,
        pending: `${baseUrl}/`,
      },
      auto_return: 'approved',
    };

    console.log("[MP] Payload validado. Enviando para MP...");

    const result = await preference.create({ body });
    
    console.log("[MP] Preferência criada com sucesso. ID:", result.id);
    res.json({ id: result.id, init_point: result.init_point });

  } catch (error: any) {
    console.error('[MP] Erro fatal ao criar preferência:', error);
    
    let details = 'Erro desconhecido';
    try {
      if (error.response && error.response.data) {
        details = JSON.stringify(error.response.data);
      } else if (error.message) {
        details = error.message;
      } else {
        details = String(error);
      }
    } catch (e) {
      details = 'Erro ao extrair detalhes (possível referência circular)';
    }

    res.status(500).json({ 
      error: 'Erro ao processar pagamento no Mercado Pago',
      details
    });
  }
});

// --- WEBHOOK MERCADO PAGO ---
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    const token = req.query.token as string;
    
    console.log("[Webhook MP] Recebido:", { type, id: data?.id, hasToken: !!token });

    if (type === 'payment' && data?.id && token) {
      // Busca os detalhes do pagamento no Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();
        console.log(`[Webhook MP] Status do pagamento ${data.id}:`, payment.status);
        
        if (payment.status === 'approved') {
          const orderId = payment.external_reference;
          if (orderId) {
            // Atualiza o status no Firestore via REST API
            const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'nilo-lanches-f2557';
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${orderId}?updateMask.fieldPaths=status`;
            
            const updateRes = await fetch(firestoreUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: { status: { stringValue: 'NOVO' } }
              })
            });

            if (updateRes.ok) {
              console.log(`[Webhook MP] Pedido ${orderId} atualizado para NOVO com sucesso!`);
            } else {
              console.error(`[Webhook MP] Falha ao atualizar pedido ${orderId} no Firestore:`, await updateRes.text());
            }
          }
        }
      } else {
        console.error("[Webhook MP] Erro ao buscar pagamento:", await paymentResponse.text());
      }
    }
    
    // Sempre retornar 200 OK para o Mercado Pago parar de enviar a notificação
    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook MP] Erro interno:', error);
    res.sendStatus(500);
  }
});

app.post('/api/create_pagseguro_checkout', async (req, res) => {
  try {
    const { items, sender, reference, email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email e Token do PagSeguro são obrigatórios' });
    }

    const isSandbox = email.includes('sandbox');
    const url = isSandbox 
      ? 'https://ws.sandbox.pagseguro.uol.com.br/v2/checkout' 
      : 'https://ws.pagseguro.uol.com.br/v2/checkout';

    const params = new URLSearchParams();
    params.append('email', email);
    params.append('token', token);
    params.append('currency', 'BRL');
    params.append('reference', reference);
    params.append('senderName', sender.name);
    params.append('senderEmail', sender.email);
    
    params.append('shippingAddressRequired', 'false');

    items.forEach((item: any, index: number) => {
      const i = index + 1;
      params.append(`itemId${i}`, item.id);
      params.append(`itemDescription${i}`, item.description);
      params.append(`itemAmount${i}`, item.amount);
      params.append(`itemQuantity${i}`, item.quantity);
    });

    console.log(`Enviando requisição para PagSeguro (${isSandbox ? 'Sandbox' : 'Produção'})...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=ISO-8859-1'
      },
      body: params
    });

    const xmlText = await response.text();
    
    if (!response.ok) {
      console.error('Erro PagSeguro:', response.status, xmlText);
      return res.status(response.status).send(xmlText);
    }

    const codeMatch = xmlText.match(/<code>(.*?)<\/code>/);
    
    if (codeMatch && codeMatch[1]) {
      res.json({ code: codeMatch[1] });
    } else {
      console.error('Código não encontrado no XML:', xmlText);
      res.status(500).json({ error: 'Código de checkout não retornado pelo PagSeguro', xml: xmlText });
    }

  } catch (error: any) {
    console.error('Erro ao criar checkout PagSeguro:', error);
    res.status(500).json({ 
      error: 'Erro interno ao processar PagSeguro',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is healthy' });
});

// Vite middleware para desenvolvimento
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  async function setupVite() {
    if (!createViteServer) {
      const m = await import('vite');
      createViteServer = m.createServer;
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: process.cwd(),
    });
    app.use(vite.middlewares);
  }
  setupVite();
} else if (!process.env.VERCEL) {
  // Em produção fora da Vercel (ex: Docker ou VPS), servir arquivos estáticos
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('dist', 'index.html'));
  });
}

// O listen só deve rodar se não estivermos na Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Removido o startServer() async que envolvia as rotas

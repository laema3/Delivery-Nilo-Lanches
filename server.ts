import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    // Rotas de API
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Backend is healthy' });
    });

    // --- REIMPLEMENTAÇÃO LIMPA MERCADO PAGO ---
    app.post('/api/checkout/mercadopago', async (req, res) => {
      try {
        console.log("[MP] Iniciando criação de preferência...");
        const { items, payer, external_reference, accessToken } = req.body;

        if (!accessToken) {
          console.error("[MP] Erro: Access Token ausente.");
          return res.status(400).json({ error: 'Access Token é obrigatório' });
        }

        // Inicializa o cliente com o token recebido
        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const preference = new Preference(client);

        // Determina a URL base dinamicamente
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const origin = req.get('origin') || `${protocol}://${host}`;
        
        const baseUrl = process.env.APP_URL || origin;
        console.log("[MP] Base URL para retorno:", baseUrl);

        const body = {
          items: items.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: 'BRL',
          })),
          payer: {
            email: payer.email,
            name: payer.name,
          },
          external_reference: String(external_reference),
          back_urls: {
            success: `${baseUrl}/`,
            failure: `${baseUrl}/`,
            pending: `${baseUrl}/`,
          },
          auto_return: 'approved',
        };

        console.log("[MP] Payload da preferência:", JSON.stringify(body, null, 2));

        const result = await preference.create({ body });
        
        console.log("[MP] Preferência criada com sucesso. ID:", result.id);
        res.json({ id: result.id, init_point: result.init_point });

      } catch (error: any) {
        console.error('[MP] Erro ao criar preferência:', error);
        res.status(500).json({ 
          error: 'Erro ao processar pagamento no Mercado Pago',
          details: error.message || String(error)
        });
      }
    });
    // -------------------------------------------

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
        
        // Configurações opcionais
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

        // Extrai o código do XML usando Regex simples para evitar dependência de xml2js
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

    // Vite middleware para desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: process.cwd(),
      });
      app.use(vite.middlewares);
    } else {
      // Em produção, servir os arquivos estáticos do build do Vite
      app.use(express.static('dist'));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve('dist', 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

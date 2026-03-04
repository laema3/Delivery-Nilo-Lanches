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

// Configuração do Mercado Pago
const getMPClient = (token?: string) => {
  return new MercadoPagoConfig({ 
    accessToken: token || process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    options: { timeout: 5000 }
  });
};

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    // Rotas de API
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Backend is healthy' });
    });

    app.post('/api/create_preference', async (req, res) => {
      try {
        const { items, payer, external_reference, accessToken } = req.body;
        
        const token = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;

        if (!token) {
          return res.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' });
        }

        const client = getMPClient(token);
        const preference = new Preference(client);
        
        const result = await preference.create({
          body: {
            items: items.map((item: any) => ({
              id: item.id,
              title: item.title,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              currency_id: 'BRL',
            })),
            payer: {
              email: payer.email,
              name: payer.name,
            },
            external_reference: external_reference,
            back_urls: {
              success: `${process.env.APP_URL || 'http://localhost:3000'}/?status=success`,
              failure: `${process.env.APP_URL || 'http://localhost:3000'}/?status=failure`,
              pending: `${process.env.APP_URL || 'http://localhost:3000'}/?status=pending`,
            },
            auto_return: 'approved',
            notification_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/mercado-pago-webhook`,
          }
        });

        // O init_point está dentro do objeto retornado pelo SDK v2
        res.json({ id: result.id, init_point: result.init_point });
      } catch (error) {
        console.error('Erro ao criar preferência:', error);
        res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
      }
    });

    // Webhook para notificações do Mercado Pago
    app.post('/api/mercado-pago-webhook', async (req, res) => {
      const { query } = req;
      const topic = query.topic || query.type;
      
      console.log('🔔 Webhook Mercado Pago:', topic, req.body);
      
      // Aqui você implementaria a lógica para verificar o pagamento via API do MP
      // e atualizar o status no Firebase usando firebase-admin
      
      res.sendStatus(200);
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

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis do arquivo .env se existir
  const env = loadEnv(mode, '.', '');
  
  // Captura a API_KEY do arquivo .env OU das variáveis de ambiente do sistema (Vercel)
  const apiKey = env.API_KEY || process.env.API_KEY;

  // Mapeia variáveis VITE_ normalmente
  const envDefinitions = Object.keys(env)
    .filter((key) => key.startsWith('VITE_'))
    .reduce((acc, key) => {
      acc[`process.env.${key}`] = JSON.stringify(env[key]);
      return acc;
    }, {});

  return {
    plugins: [react()],
    define: {
      ...envDefinitions,
      // Injeta explicitamente a API_KEY para garantir funcionamento em produção
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    server: {
      port: 3000,
      open: true,
      strictPort: true
    }
  };
});
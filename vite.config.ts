import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Mapeia todas as variáveis que começam com VITE_ para o define
  const envDefinitions = Object.keys(env)
    .filter((key) => key.startsWith('VITE_') || key === 'API_KEY')
    .reduce((acc, key) => {
      acc[`process.env.${key}`] = JSON.stringify(env[key]);
      return acc;
    }, {});

  return {
    plugins: [react()],
    define: {
      ...envDefinitions,
      // Garante que process.env exista para evitar erros de referência
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    server: {
      port: 3000,
      open: true,
      strictPort: true
    }
  };
});
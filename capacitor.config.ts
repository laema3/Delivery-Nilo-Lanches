
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.nilolanches.delivery',
  appName: 'Nilo Lanches',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://delivery.nilolanches.com.br',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

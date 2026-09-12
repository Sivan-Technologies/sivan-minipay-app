import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Allows MiniPay Developer Mode ngrok tunnels to test without "Blocked request" errors
    allowedHosts: [
      '.ngrok.app',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      'localhost',
      '127.0.0.1',
    ],
  },
});

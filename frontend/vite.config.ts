import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: process.env.NGROK_HOST ? [process.env.NGROK_HOST] : [], proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true } } },
});

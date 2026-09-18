import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, '.', 'VITE_').VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';
  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': target,
      '/health': target,
      '/ready': target,
    },
  },
  };
});

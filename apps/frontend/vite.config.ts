import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['uva.uversstudio.com'],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'ws://127.0.0.1:5001',
          ws: true,
        }
      }
    },
    plugins: [react()],
    define: {

    },
    optimizeDeps: {
      include: ['html5-qrcode']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

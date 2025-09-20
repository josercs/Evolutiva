// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // ensure cookies are not stripped in dev
            const sc = proxyRes.headers['set-cookie'];
            if (sc && Array.isArray(sc)) {
              proxyRes.headers['set-cookie'] = sc.map((c) => c.replace(/;\s*SameSite=Lax/i, ''));
            }
          });
        },
      },
    },
  },
});
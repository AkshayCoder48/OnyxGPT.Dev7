import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'isolation-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const isBridge = req.url && req.url.includes('auth-bridge.html');
          if (!isBridge) {
            res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const isBridge = req.url && req.url.includes('auth-bridge.html');
          if (!isBridge) {
            res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          }
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['@webcontainer/api'],
  },
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'resolve-module-polyfill',
      enforce: 'pre',
      resolveId(id) {
        if (id === 'module' || id === 'node:module') {
          return path.resolve(__dirname, './src/module-polyfill.js');
        }
      },
    },
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'path', 'fs'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
});

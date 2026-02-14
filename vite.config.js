import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Provide necessary polyfills for the CodeSandbox SDK
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      // Some versions of the SDK may require explicit module aliasing in the browser
      'module': 'node-stdlib-browser/esm/mock/empty.js',
    }
  },
  optimizeDeps: {
    include: ['@codesandbox/sdk', 'codesandbox'],
  }
});

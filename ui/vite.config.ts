import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      overrides: {
        crypto: path.resolve(__dirname, 'src/shims/crypto.ts'),
      },
      protocolImports: true,
    }),
  ],
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  optimizeDeps: {
    include: [
      'object-inspect',
      'crypto-browserify',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts'
    ]
  },
  resolve: {
    alias: {
      '@midnight-ntwrk/compact-runtime': path.resolve(__dirname, 'node_modules/@midnight-ntwrk/compact-runtime/dist/index.js')
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts'
    ]
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});

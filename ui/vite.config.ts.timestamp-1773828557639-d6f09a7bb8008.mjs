// vite.config.ts
import { defineConfig } from "file:///C:/Users/singh/Downloads/midnight_hello/ui/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/singh/Downloads/midnight_hello/ui/node_modules/@vitejs/plugin-react/dist/index.js";
import wasm from "file:///C:/Users/singh/Downloads/midnight_hello/ui/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///C:/Users/singh/Downloads/midnight_hello/ui/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import { nodePolyfills } from "file:///C:/Users/singh/Downloads/midnight_hello/ui/node_modules/vite-plugin-node-polyfills/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\singh\\Downloads\\midnight_hello\\ui";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      overrides: {
        crypto: path.resolve(__vite_injected_original_dirname, "src/shims/crypto.ts")
      },
      protocolImports: true
    })
  ],
  server: {
    port: 3e3,
    open: true
  },
  optimizeDeps: {
    include: [
      "object-inspect",
      "crypto-browserify",
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/compact-js",
      "@midnight-ntwrk/midnight-js-contracts"
    ]
  },
  resolve: {
    alias: {
      "@midnight-ntwrk/compact-runtime": path.resolve(__vite_injected_original_dirname, "node_modules/@midnight-ntwrk/compact-runtime/dist/index.js")
    },
    dedupe: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/compact-js",
      "@midnight-ntwrk/midnight-js-contracts"
    ]
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaW5naFxcXFxEb3dubG9hZHNcXFxcbWlkbmlnaHRfaGVsbG9cXFxcdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNpbmdoXFxcXERvd25sb2Fkc1xcXFxtaWRuaWdodF9oZWxsb1xcXFx1aVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvc2luZ2gvRG93bmxvYWRzL21pZG5pZ2h0X2hlbGxvL3VpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHdhc20gZnJvbSAndml0ZS1wbHVnaW4td2FzbSc7XG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tICd2aXRlLXBsdWdpbi10b3AtbGV2ZWwtYXdhaXQnO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB3YXNtKCksXG4gICAgdG9wTGV2ZWxBd2FpdCgpLFxuICAgIG5vZGVQb2x5ZmlsbHMoe1xuICAgICAgZ2xvYmFsczoge1xuICAgICAgICBCdWZmZXI6IHRydWUsXG4gICAgICAgIGdsb2JhbDogdHJ1ZSxcbiAgICAgICAgcHJvY2VzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBvdmVycmlkZXM6IHtcbiAgICAgICAgY3J5cHRvOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3NoaW1zL2NyeXB0by50cycpLFxuICAgICAgfSxcbiAgICAgIHByb3RvY29sSW1wb3J0czogdHJ1ZSxcbiAgICB9KSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAnb2JqZWN0LWluc3BlY3QnLFxuICAgICAgJ2NyeXB0by1icm93c2VyaWZ5JyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1ydW50aW1lJyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1qcycsXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL21pZG5pZ2h0LWpzLWNvbnRyYWN0cydcbiAgICBdXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0BtaWRuaWdodC1udHdyay9jb21wYWN0LXJ1bnRpbWUnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzL0BtaWRuaWdodC1udHdyay9jb21wYWN0LXJ1bnRpbWUvZGlzdC9pbmRleC5qcycpXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1ydW50aW1lJyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1qcycsXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL21pZG5pZ2h0LWpzLWNvbnRyYWN0cydcbiAgICBdXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICBpbmNsdWRlOiBbL25vZGVfbW9kdWxlcy9dLFxuICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWVcbiAgICB9XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VCxTQUFTLG9CQUFvQjtBQUN6VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sVUFBVTtBQUxqQixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsSUFDTCxjQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUSxLQUFLLFFBQVEsa0NBQVcscUJBQXFCO0FBQUEsTUFDdkQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLElBQ25CLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1A7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLG1DQUFtQyxLQUFLLFFBQVEsa0NBQVcsNERBQTREO0FBQUEsSUFDekg7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsaUJBQWlCO0FBQUEsTUFDZixTQUFTLENBQUMsY0FBYztBQUFBLE1BQ3hCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

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
    nodePolyfills()
  ],
  server: {
    port: 3e3,
    open: true
  },
  optimizeDeps: {
    include: ["object-inspect", "@midnight-ntwrk/midnight-js-contracts"],
    exclude: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/compact-js"
    ]
  },
  resolve: {
    alias: {
      "@midnight-ntwrk/compact-runtime": path.resolve(__vite_injected_original_dirname, "../node_modules/@midnight-ntwrk/compact-runtime"),
      "@midnight-ntwrk/compact-js": path.resolve(__vite_injected_original_dirname, "../node_modules/@midnight-ntwrk/compact-js"),
      "@midnight-ntwrk/midnight-js-contracts": path.resolve(__vite_injected_original_dirname, "../node_modules/@midnight-ntwrk/midnight-js-contracts")
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaW5naFxcXFxEb3dubG9hZHNcXFxcbWlkbmlnaHRfaGVsbG9cXFxcdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNpbmdoXFxcXERvd25sb2Fkc1xcXFxtaWRuaWdodF9oZWxsb1xcXFx1aVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvc2luZ2gvRG93bmxvYWRzL21pZG5pZ2h0X2hlbGxvL3VpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHdhc20gZnJvbSAndml0ZS1wbHVnaW4td2FzbSc7XG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tICd2aXRlLXBsdWdpbi10b3AtbGV2ZWwtYXdhaXQnO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB3YXNtKCksXG4gICAgdG9wTGV2ZWxBd2FpdCgpLFxuICAgIG5vZGVQb2x5ZmlsbHMoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ29iamVjdC1pbnNwZWN0JywgJ0BtaWRuaWdodC1udHdyay9taWRuaWdodC1qcy1jb250cmFjdHMnXSxcbiAgICBleGNsdWRlOiBbXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL2NvbXBhY3QtcnVudGltZScsXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL2NvbXBhY3QtanMnXG4gICAgXVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1ydW50aW1lJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL25vZGVfbW9kdWxlcy9AbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1ydW50aW1lJyksXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL2NvbXBhY3QtanMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vbm9kZV9tb2R1bGVzL0BtaWRuaWdodC1udHdyay9jb21wYWN0LWpzJyksXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL21pZG5pZ2h0LWpzLWNvbnRyYWN0cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9ub2RlX21vZHVsZXMvQG1pZG5pZ2h0LW50d3JrL21pZG5pZ2h0LWpzLWNvbnRyYWN0cycpXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1ydW50aW1lJyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvY29tcGFjdC1qcycsXG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL21pZG5pZ2h0LWpzLWNvbnRyYWN0cydcbiAgICBdXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICBpbmNsdWRlOiBbL25vZGVfbW9kdWxlcy9dLFxuICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWVcbiAgICB9XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VCxTQUFTLG9CQUFvQjtBQUN6VixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sVUFBVTtBQUxqQixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsSUFDTCxjQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsa0JBQWtCLHVDQUF1QztBQUFBLElBQ25FLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxtQ0FBbUMsS0FBSyxRQUFRLGtDQUFXLGlEQUFpRDtBQUFBLE1BQzVHLDhCQUE4QixLQUFLLFFBQVEsa0NBQVcsNENBQTRDO0FBQUEsTUFDbEcseUNBQXlDLEtBQUssUUFBUSxrQ0FBVyx1REFBdUQ7QUFBQSxJQUMxSDtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ047QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxpQkFBaUI7QUFBQSxNQUNmLFNBQVMsQ0FBQyxjQUFjO0FBQUEsTUFDeEIseUJBQXlCO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

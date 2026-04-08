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
    include: [
      "object-inspect",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaW5naFxcXFxEb3dubG9hZHNcXFxcbWlkbmlnaHRfaGVsbG9cXFxcdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNpbmdoXFxcXERvd25sb2Fkc1xcXFxtaWRuaWdodF9oZWxsb1xcXFx1aVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvc2luZ2gvRG93bmxvYWRzL21pZG5pZ2h0X2hlbGxvL3VpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHdhc20gZnJvbSAndml0ZS1wbHVnaW4td2FzbSc7XG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tICd2aXRlLXBsdWdpbi10b3AtbGV2ZWwtYXdhaXQnO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB3YXNtKCksXG4gICAgdG9wTGV2ZWxBd2FpdCgpLFxuICAgIG5vZGVQb2x5ZmlsbHMoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAnb2JqZWN0LWluc3BlY3QnLFxuICAgICAgJ0BtaWRuaWdodC1udHdyay9jb21wYWN0LXJ1bnRpbWUnLFxuICAgICAgJ0BtaWRuaWdodC1udHdyay9jb21wYWN0LWpzJyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvbWlkbmlnaHQtanMtY29udHJhY3RzJ1xuICAgIF1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQG1pZG5pZ2h0LW50d3JrL2NvbXBhY3QtcnVudGltZSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMvQG1pZG5pZ2h0LW50d3JrL2NvbXBhY3QtcnVudGltZS9kaXN0L2luZGV4LmpzJylcbiAgICB9LFxuICAgIGRlZHVwZTogW1xuICAgICAgJ0BtaWRuaWdodC1udHdyay9jb21wYWN0LXJ1bnRpbWUnLFxuICAgICAgJ0BtaWRuaWdodC1udHdyay9jb21wYWN0LWpzJyxcbiAgICAgICdAbWlkbmlnaHQtbnR3cmsvbWlkbmlnaHQtanMtY29udHJhY3RzJ1xuICAgIF1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgIGluY2x1ZGU6IFsvbm9kZV9tb2R1bGVzL10sXG4gICAgICB0cmFuc2Zvcm1NaXhlZEVzTW9kdWxlczogdHJ1ZVxuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRULFNBQVMsb0JBQW9CO0FBQ3pWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxtQkFBbUI7QUFDMUIsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxVQUFVO0FBTGpCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLEtBQUs7QUFBQSxJQUNMLGNBQWM7QUFBQSxJQUNkLGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLG1DQUFtQyxLQUFLLFFBQVEsa0NBQVcsNERBQTREO0FBQUEsSUFDekg7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsaUJBQWlCO0FBQUEsTUFDZixTQUFTLENBQUMsY0FBYztBQUFBLE1BQ3hCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

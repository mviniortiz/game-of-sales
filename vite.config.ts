import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    // Libera túneis de preview (cloudflare/localtunnel) pra revisar no celular.
    // Sem isso o Vite responde 403 a hosts externos (proteção DNS-rebinding).
    allowedHosts: [".trycloudflare.com", ".loca.lt"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // keepNames: a minificação NÃO renomeia classes/funções. O @google/genai
  // (WebSocket do Live) quebrava em produção (build minificado) — "WebSocket is
  // already in CLOSING or CLOSED state" — mas funcionava em dev (não minificado).
  esbuild: { keepNames: true },
  build: {
    target: "es2020",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Keep React runtime (including react/jsx-runtime) together
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id) || /[\\/]node_modules[\\/]motion[\\/]/.test(id)) {
            return "vendor-motion";
          }
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-query/.test(id)) {
            return "vendor-query";
          }
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) {
            return "vendor-ui";
          }
        },
      },
    },
  },
});

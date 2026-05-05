import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const proxyTarget = process.env.VITE_API_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@templates": path.resolve(__dirname, "src/templates"),
        "@navigation": path.resolve(__dirname, "src/navigation"),
        "@app-types": path.resolve(__dirname, "src/types"),
        "react": path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "react-router-dom": path.resolve(__dirname, "node_modules/react-router-dom"),
        "echarts": path.resolve(__dirname, "node_modules/echarts"),
      },
      dedupe: ["react", "react-dom", "react-router-dom", "echarts"],
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

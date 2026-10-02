import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.BGM_API_ORIGIN ?? "http://127.0.0.1:63301";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(root, "src") },
    },
    server: {
      host: true,
      allowedHosts: ["bgm.lunarsystem.co.kr"],
      port: Number(env.VITE_DEV_PORT || 63300),
      proxy: {
        "/api": { target: backend, changeOrigin: true },
      },
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT || 63300),
      proxy: {
        "/api": { target: backend, changeOrigin: true },
      },
    },
  };
});

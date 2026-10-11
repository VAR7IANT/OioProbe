import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    base: "/",
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://127.0.0.1:25774",
          ws: true,
        },
        "/admin": { target: env.VITE_API_TARGET || "http://127.0.0.1:25774" },
      },
    },
    build: { outDir: "dist", sourcemap: false },
  };
});

import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4050",
        changeOrigin: true,
        ...(process.env["BACKEND_API_TOKEN"]
          ? { headers: { Authorization: `Bearer ${process.env["BACKEND_API_TOKEN"]}` } }
          : {}),
      },
    },
  },
});

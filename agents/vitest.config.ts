import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@techtide/agents": path.resolve(__dirname, "./src"),
      "@techtide/apis": path.resolve(__dirname, "../apis/src/index.ts"),
    },
  },
});

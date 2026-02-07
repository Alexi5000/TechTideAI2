import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@techtide/agents": new URL("./src", import.meta.url).pathname,
    },
  },
});

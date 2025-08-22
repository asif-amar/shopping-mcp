import { defineConfig } from "vitest/config.js";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});

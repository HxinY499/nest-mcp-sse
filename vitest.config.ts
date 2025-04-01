import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/?(*.)+(spec|test).ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
    environment: "node",
    globals: true,
    testTimeout: 30000,
    teardownTimeout: 10000,
    hookTimeout: 10000,
  },
});

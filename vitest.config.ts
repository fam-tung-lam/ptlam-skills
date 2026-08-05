import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/tools/plugin-compiler/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      exclude: ["tests/**"],
      include: ["tools/plugin-compiler/**/*.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});

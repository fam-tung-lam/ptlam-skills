import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      exclude: ["tests/**", "**/*.config.ts"],
      include: ["{plugin,tools}/**/*.ts"],
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

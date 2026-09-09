import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "mlb-api",
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Only `parse.ts` and `coverage.ts` carry runtime code; the other
      // modules are upstream type declarations that erase at compile time.
      include: ["src/parse.ts", "src/coverage.ts"],
      thresholds: {
        lines: 90,
        functions: 100,
        branches: 75,
        statements: 90,
      },
    },
  },
});

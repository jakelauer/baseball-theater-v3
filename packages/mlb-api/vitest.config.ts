import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "mlb-api",
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // `parse.ts`, `coverage.ts` and `replay.ts` carry runtime code (schemas,
      // the leaf-path diff, the RFC6902 fold); every other module is upstream
      // type declarations that erase at compile time.
      include: ["src/parse.ts", "src/coverage.ts", "src/replay.ts"],
      thresholds: {
        lines: 90,
        functions: 100,
        branches: 75,
        statements: 90,
      },
    },
  },
});

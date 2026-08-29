import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*/vitest.config.ts",
      "functions/vitest.config.ts",
      "web/vitest.config.ts",
    ],
  },
});

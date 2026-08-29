import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "ports",
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});

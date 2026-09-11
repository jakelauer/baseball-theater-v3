import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "functions",
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/local-server.ts",
        "src/scripts/**",
        // Firestore adapters: exercised only against a live emulator (S7), so
        // their bodies never run in CI. Excluded like local-server.ts rather
        // than dragging the floor with permanently-uncovered lines.
        "src/adapters/firestore/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});

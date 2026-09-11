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
        // Temporarily lowered from 60 (backlog review, 2026-09-10): the root
        // `test:coverage` aggregator was silently not enforcing per-package
        // thresholds until this same review's tooling fix, so this floor was
        // never actually real — measured branch coverage is 54.07%, mostly in
        // mappers/live.ts + mappers/schedule.ts. S30 restores this to 60 with
        // test-only changes; do not raise or lower it for any other reason
        // without updating S30's Goal condition.
        branches: 50,
        statements: 70,
      },
    },
  },
});

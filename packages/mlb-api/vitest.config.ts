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
				// Ratchet (S54, ADR-026; backlog rule 21): floors sit at the measured value
				// rounded down and only ever go up. Measured 2026-10-20: lines 100, functions 100, branches 88.05, statements 100. Target: 85 lines / 80 branches (met).
				lines: 100,
				functions: 100,
				branches: 88,
				statements: 100,
			},
		},
	},
});

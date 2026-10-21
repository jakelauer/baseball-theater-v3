import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "domain",
		environment: "node",
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/index.ts"],
			thresholds: {
				// Ratchet (S54, ADR-026; backlog rule 21): floors sit at the measured value
				// rounded down and only ever go up. Measured 2026-10-20: lines 95.95, functions 94.28, branches 87.5, statements 95.95. Target: 95 lines (met).
				lines: 95,
				functions: 94,
				branches: 87,
				statements: 95,
			},
		},
	},
});

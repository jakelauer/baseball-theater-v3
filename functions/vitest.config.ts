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
			],
			thresholds: {
				// Ratchet (S54, ADR-026; backlog rule 21): floors sit at the measured value
				// rounded down and only ever go up. Measured 2026-10-20: lines 80.01, functions 87.77, branches 78.21, statements 80.01. Target: 85 lines / 80 branches.
				lines: 80,
				functions: 87,
				branches: 78,
				statements: 80,
			},
		},
	},
});

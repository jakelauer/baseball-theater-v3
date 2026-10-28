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
				// rounded down and only ever go up. Measured 2026-10-20: lines 80.01, functions 87.77, branches 78.21, statements 80.01.
				// Raised 2026-10-23 by S46 (repository contract + versioning tests; S44's gain folded in):
				// lines 82.45, functions 90, branches 80.04, statements 82.45. Target: 85 lines / 80 branches.
				// Raised 2026-10-23 by S8 (session, sign-in and /me tests): lines 87.99, functions 92.53, branches 82.61,
				// statements 87.99. Target met: 85 lines / 80 branches.
				// Raised 2026-10-24 by S77 (S76's lag folded in; export/delete, deletion log and manifest tests):
				// lines 89.85, branches 85.54, statements 89.85.
				// Raised 2026-10-24 by S6 (settings routes, repository and deletion case (i)): lines 90.26, functions 93.4,
				// branches 85.98, statements 90.26.
				// Raised 2026-10-28 by S80 (download routes, stores and mailer; S6's branch lag folded in): lines 91.33,
				// functions 94.58, branches 86.57, statements 91.33.
				lines: 91,
				functions: 94,
				branches: 86,
				statements: 91,
			},
		},
	},
});

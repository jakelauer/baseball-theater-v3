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
				lines: 85,
				functions: 90,
				branches: 60,
				statements: 85,
			},
		},
	},
});

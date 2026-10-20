import { defineConfig } from "vitest/config";

// Tests for repo tooling (custom ESLint rules). Run by `pnpm test:tools`, part of `pnpm verify`.
export default defineConfig({
	test: {
		name: "tools",
		environment: "node",
		root: import.meta.dirname,
		include: ["**/*.test.js"],
		exclude: ["**/node_modules/**", "**/fixtures/**"],
	},
});

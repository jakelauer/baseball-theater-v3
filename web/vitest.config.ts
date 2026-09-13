import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		name: "web",
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/**/*.test.{ts,tsx}", "src/main.tsx", "src/test/**", "dist/**"],
			thresholds: {
				// Re-baselined 2026-09-10 (backlog review) then raised 2026-09-13
				// (S26): `web/src/api/client.ts` went from zero tests to full coverage
				// (a real fetch mock, not just the type-level check) — functions
				// 38.88% -> 55.55%, lines/statements 3.6% -> 5.15%. Floor moved to
				// just under measured, with headroom for accidental regressions, per
				// the standing instruction that each story touching a zero-tested
				// surface should raise this, not just hold it flat. Still low:
				// `GamePage.tsx`, `ScoreboardPage.tsx`, `SearchPage.tsx`,
				// `SettingsPage.tsx`, `App.tsx`, `routes.tsx`, and most of
				// `components/pitch/*` still have zero tests — S24 (already landed,
				// theme-only, correctly added none), S25 (query-cache migration), and
				// S2–S5/S10 (real tab content) are the remaining stories expected to
				// raise it further as they land tests for the page(s) they touch.
				lines: 5,
				functions: 55,
				branches: 55,
				statements: 5,
			},
		},
	},
});

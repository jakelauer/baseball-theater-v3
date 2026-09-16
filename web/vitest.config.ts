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
				// Raised 2026-09-15 by S25: the query-cache migration added real tests
				// for `src/api/*` (descriptors, typed cache writes, two readers sharing
				// one entry) — lines/statements 5.15% -> 11.67%, branches 55% -> 68.75%,
				// functions unchanged at 55.55%. Floors sit just under measured, with
				// headroom. Still low overall: `GamePage.tsx` and `ScoreboardPage.tsx`
				// now read through hooks but have no component tests of their own, and
				// `SearchPage.tsx`, `SettingsPage.tsx`, `App.tsx`, `routes.tsx`, and most
				// of `components/pitch/*` have none either — S2–S5/S10 are expected to
				// raise this further as they land the tab content they own (rule: a story
				// touching a zero-tested surface raises this, never just holds it flat).
				lines: 11,
				functions: 55,
				branches: 65,
				statements: 11,
			},
		},
	},
});

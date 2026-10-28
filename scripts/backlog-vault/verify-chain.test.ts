/**
 * Law P8 (docs/v3/LAWS.md; S81, S85): `pnpm verify` starts no browser — Playwright
 * runs only through `pnpm design:capture` and S62's flows, never in the gate every
 * commit passes. Owner, 2026-10-28: "Yes: P1, P3, P5, P8".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import { browserSteps, verifyChain } from "./verify-chain.ts";

const scripts = (JSON.parse(readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8")) as { scripts: Record<string, string> }).scripts;

describe("pnpm verify starts no browser (law P8)", () =>
{
	it("no script in the verify chain runs playwright, design:capture or e2e/", () =>
	{
		expect(verifyChain(scripts).has("lint")).toBe(true);
		expect(browserSteps(scripts)).toEqual([]);
	});

	it("catches a playwright step reached through the chain", () =>
	{
		expect(browserSteps({
			verify: "pnpm lint && pnpm e2e",
			lint: "eslint .",
			e2e: "playwright test --config e2e/playwright.config.ts",
		})).toEqual(["e2e"]);
	});
});

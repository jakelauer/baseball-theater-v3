/**
 * Law P11 (docs/v3/LAWS.md; S62; owner, 2026-10-29: "Yes", to running all of
 * `pnpm verify` in CI): CI runs `pnpm verify`, so every law the gate holds —
 * including `pnpm dup:check` (L7) and `pnpm size` (L5) — also holds on every push,
 * not only where someone runs it locally.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";

const CI_YML = fileURLToPath(new URL("../../.github/workflows/ci.yml", import.meta.url));

/** The commands of a workflow's `run:` steps, one per step (single-line runs only). */
export function runSteps(workflow: string): string[]
{
	return [...workflow.matchAll(/^\s*run:\s*(.+?)\s*$/gm)].map((m) => m[1]!);
}

describe("CI runs pnpm verify (law P11)", () =>
{
	it(".github/workflows/ci.yml has a step that runs pnpm verify", () =>
	{
		expect(runSteps(readFileSync(CI_YML, "utf8"))).toContain("pnpm verify");
	});

	it("catches a workflow that runs only parts of the gate", () =>
	{
		expect(runSteps("steps:\n  - run: pnpm lint\n  - run: pnpm build\n")).not.toContain("pnpm verify");
	});
});

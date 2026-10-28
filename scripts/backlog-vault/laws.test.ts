/**
 * `docs/v3/LAWS.md` (S84): every law marked **enforced** names a file that exists and a
 * step that `pnpm verify` actually runs, so the registry can't claim a guard that has
 * quietly gone away. Proposed laws are skipped — nothing enforces them yet.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import { verifyChain } from "./verify-chain.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Law
{
	id: string;
	enforcedBy: string;
	step: string;
	status: string;
}

/** The rows of the first table under `## The laws`. */
export function parseLaws(markdown: string): Law[]
{
	const section = markdown.split(/^## The laws$/m)[1]?.split(/^## /m)[0] ?? "";
	return section.split("\n")
		.filter((line) => /^\| [LP]\d+ \|/.test(line))
		.map((line) =>
		{
			const cells = line.split(" | ").map((c) => c.replace(/^\| ?| ?\|$/g, "").trim());
			return {
				id: cells[0] ?? "",
				enforcedBy: /`([^`]+)`/.exec(cells[3] ?? "")?.[1] ?? "",
				step: cells[4] ?? "",
				status: cells[5] ?? "",
			};
		});
}

const laws = parseLaws(readFileSync(join(ROOT, "docs/v3/LAWS.md"), "utf8"));
const chain = verifyChain((JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> }).scripts);

describe("docs/v3/LAWS.md (S84)", () =>
{
	it("lists enforced and proposed laws", () =>
	{
		expect(laws.filter((l) => l.status === "enforced").length).toBeGreaterThan(0);
		expect(laws.every((l) => l.status === "enforced" || l.status === "proposed")).toBe(true);
	});

	for (const law of laws.filter((l) => l.status === "enforced"))
	{
		it(`${law.id}: ${law.enforcedBy} exists and its step "${law.step}" is in the pnpm verify chain`, () =>
		{
			expect(existsSync(join(ROOT, law.enforcedBy)), law.enforcedBy).toBe(true);
			expect(chain.has(law.step), `verify chain: ${[...chain].join(", ")}`).toBe(true);
		});
	}

	it("the check itself catches a missing file and a step outside the chain", () =>
	{
		const fake = parseLaws("## The laws\n\n| ID | Law | Source | Enforced by | Step | Status |\n| L9 | x | y | `no/such/file.ts` | deploy | enforced |\n");
		expect(existsSync(join(ROOT, fake[0]!.enforcedBy))).toBe(false);
		expect(verifyChain({
			verify: "pnpm lint",
			lint: "eslint .",
		}).has("deploy")).toBe(false);
	});
});

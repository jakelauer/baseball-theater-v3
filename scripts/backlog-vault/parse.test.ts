import {
	describe, expect, it,
} from "vitest";
import { BacklogParseError, parseBacklog } from "./parse.ts";

const table = (rows: string[]) => ["### Story status", "", "| Priority | ID | Story | Status |", "|---|---|---|---|", ...rows, ""].join("\n");

const FIXTURE = [
	table([
		"| 1 | [S1](#s1) | First *(pilot)* | `done` |",
		"| 2 | [S7](#s7) | Seventh | `todo` |",
	]),
	"## Current baseline",
	"",
	"| Area | State |",
	"|------|-------|",
	"| Thing | Working |",
	"",
	"---",
	"",
	"## Stories",
	"",
	"### S7 — Seventh",
	"",
	"**Depends on:** S1 (and S1 again), S3",
	"",
	"**Prefer after:** **S2** and S4",
	"",
	"**Scope files:** `web/`, `docs/v3/BACKLOG.md`",
	"",
	"**Goal condition:** scripts/verify-S7.sh exits 0, or stop after 12 turns.",
	"",
	"**Turn cap:** 16 — assumes things.",
	"",
	"**Status:** `todo`",
	"",
	"",
	"---",
	"",
	"## Data platform",
	"",
	"### S1 — First *(pilot)*",
	"",
	"**Goal condition:** stop after 8 turns.",
	"",
	"**Status:** `done`",
	"",
	"### Later themes",
	"",
].join("\n");

describe("parseBacklog", () =>
{
	it("reads every story in file order with table priority and status", () =>
	{
		const { stories } = parseBacklog(FIXTURE);
		expect(stories.map((s) => [s.id, s.order, s.priority, s.status])).toEqual([
			["S7", 1, 2, "todo"],
			["S1", 2, 1, "done"],
		]);
	});

	it("extracts optional fields when present", () =>
	{
		const s7 = parseBacklog(FIXTURE).stories[0];
		expect(s7).toMatchObject({
			title: "Seventh",
			section: "Stories",
			dependsOn: ["S1", "S3"],
			preferAfter: ["S2", "S4"],
			turnCap: 16,
			scopeFiles: ["web/", "docs/v3/BACKLOG.md"],
		});
	});

	it("falls back to the Goal condition turn count and empty lists when fields are absent", () =>
	{
		const s1 = parseBacklog(FIXTURE).stories[1];
		expect(s1).toMatchObject({
			title: "First *(pilot)*",
			section: "Data platform",
			dependsOn: [],
			preferAfter: [],
			turnCap: 8,
			scopeFiles: [],
		});
	});

	it("keeps the section body verbatim, stopping at the next --- or heading and trimming trailing blanks", () =>
	{
		const { stories } = parseBacklog(FIXTURE);
		expect(stories[0]?.body.startsWith("\n**Depends on:** S1")).toBe(true);
		expect(stories[0]?.body.endsWith("**Status:** `todo`")).toBe(true);
		expect(stories[1]?.body.endsWith("**Status:** `done`")).toBe(true);
	});

	it("captures the Current baseline section up to its closing ---", () =>
	{
		expect(parseBacklog(FIXTURE).baseline).toBe("## Current baseline\n\n| Area | State |\n|------|-------|\n| Thing | Working |");
	});

	it("rejects a status mismatch between the table and the section", () =>
	{
		const broken = FIXTURE.replace("**Status:** `done`", "**Status:** `doing`");
		expect(() => parseBacklog(broken)).toThrow(/S1 status mismatch: table says `done`, section says `doing`/);
	});

	it("rejects a story section that is not in the status table", () =>
	{
		const broken = FIXTURE.replace("| 2 | [S7](#s7) | Seventh | `todo` |\n", "");
		expect(() => parseBacklog(broken)).toThrow(/S7 has a story section but is not in the status table/);
	});

	it("rejects a table row with no story section, and a section with no Status line", () =>
	{
		const broken = FIXTURE.replace("### S1 — First *(pilot)*", "### Not a story").replace("**Status:** `todo`", "");
		try
		{
			parseBacklog(broken);
			expect.unreachable();
		}
		catch (error)
		{
			expect(error).toBeInstanceOf(BacklogParseError);
			expect((error as BacklogParseError).problems).toEqual([
				"S7 has no **Status:** line",
				"S1 is in the status table but has no story section",
			]);
		}
	});
});

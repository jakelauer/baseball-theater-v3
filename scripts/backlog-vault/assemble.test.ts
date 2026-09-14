import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import {
	assembleBacklog, headingAnchor, VaultAssembleError,
} from "./assemble.ts";
import { parseBacklog } from "./parse.ts";
import { renderVault } from "./vault.ts";

const FIXTURE = [
	"# Checkable backlog",
	"",
	"### Story status",
	"",
	"| Priority | ID | Story | Status |",
	"|----------|----|-------|--------|",
	"| 1 | [S9](#s9--align-pnpm-dev-with-emulator-story-document--smoke) | Align `pnpm dev` | `todo` |",
	"| 2 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers *(pilot)* | `done` |",
	"",
	"**Next:** S9.",
	"",
	"---",
	"",
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
	"> Intro blockquote.",
	"",
	"### S1 — Domain window helpers fully tested *(pilot)*",
	"",
	"**Goal condition:** stop after 8 turns.",
	"",
	"**Status:** `done`",
	"   ",
	"",
	"---",
	"",
	"## Data platform — MLB access & types",
	"",
	"Group intro.",
	"",
	"### S9 — Align `pnpm dev` with emulator story (document + smoke)",
	"",
	"**Depends on:** S1",
	"",
	"**Prefer after:** **S1**",
	"",
	"**Scope files:** `package.json`, `docs/v3/BACKLOG.md`",
	"",
	"**Turn cap:** 10 — assumes things.",
	"",
	"**Status:** `todo`",
	"",
	"### Later themes (not yet story-sliced)",
	"",
	"| Theme | Notes |",
	"",
	"---",
	"",
	"## Gap map (doc → story)",
	"",
	"| Doc | Stories |",
	"",
].join("\n");

/** Rendered vault with one file's content rewritten. */
function tamper(files: Map<string, string>, path: string, edit: (content: string) => string): Map<string, string>
{
	const copy = new Map(files);
	copy.set(path, edit(copy.get(path) ?? ""));
	return copy;
}

describe("headingAnchor", () =>
{
	it("matches GitHub's anchors for story headings", () =>
	{
		expect(headingAnchor("S26 — Typed BT API route contract")).toBe("s26--typed-bt-api-route-contract");
		expect(headingAnchor("S1 — Domain window helpers fully tested *(pilot)*")).toBe("s1--domain-window-helpers-fully-tested-pilot");
		expect(headingAnchor("S12 — Live HTTP `MlbStatsClient` + domain mappers")).toBe("s12--live-http-mlbstatsclient--domain-mappers");
	});
});

describe("assembleBacklog", () =>
{
	it("round trip: a fixture with every optional field, group intros, and whitespace-only lines is byte-identical", () =>
	{
		expect(assembleBacklog(renderVault(parseBacklog(FIXTURE)))).toBe(FIXTURE);
	});

	it("round trip: the real BACKLOG.md is byte-identical", () =>
	{
		const markdown = readFileSync(join(import.meta.dirname, "../../docs/v3/BACKLOG.md"), "utf8");
		expect(assembleBacklog(renderVault(parseBacklog(markdown)))).toBe(markdown);
	});

	it("generates the status table from frontmatter, re-sorting on a priority change", () =>
	{
		const files = tamper(renderVault(parseBacklog(FIXTURE)), "stories/S9.md", (c) => c.replace("priority: 1\n", "priority: 3\n"));
		const rows = assembleBacklog(files).split("\n").filter((l) => /^\| \d+ \| \[S/.test(l));
		expect(rows.map((r) => r.slice(0, 11))).toEqual(["| 2 | [S1](", "| 3 | [S9]("]);
	});

	it("takes story bodies from the notes", () =>
	{
		const files = tamper(renderVault(parseBacklog(FIXTURE)), "stories/S1.md", (c) => c.replace("stop after 8 turns", "stop after 9 turns"));
		expect(assembleBacklog(files)).toContain("**Goal condition:** stop after 9 turns.");
	});

	it("rejects a frame that embeds a story with no note, and a note no frame embeds", () =>
	{
		const files = renderVault(parseBacklog(FIXTURE));
		const missing = new Map(files);
		missing.delete("stories/S9.md");
		expect(() => assembleBacklog(missing)).toThrow(VaultAssembleError);
		expect(() => assembleBacklog(missing)).toThrow(/embeds S9, which has no story note/);

		const framePath = [...files.keys()].find((p) => p.startsWith("frame/") && (files.get(p) ?? "").includes("![[S9]]")) ?? "";
		const orphan = tamper(files, framePath, (c) => c.replace("![[S9]]\n", ""));
		expect(() => assembleBacklog(orphan)).toThrow(/not embedded in any frame note: S9/);
	});

	it("rejects a story note whose body lost its heading", () =>
	{
		const files = tamper(renderVault(parseBacklog(FIXTURE)), "stories/S1.md", (c) => c.replace(/^# S1 — .*\n/m, ""));
		expect(() => assembleBacklog(files)).toThrow(/stories\/S1\.md: body does not start with the banner/);
	});
});

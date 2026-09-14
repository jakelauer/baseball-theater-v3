import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import {
	assembleBacklog, buildFromNotes, headingAnchor, VaultAssembleError,
} from "./assemble.ts";
import { parseBacklog } from "./parse.ts";
import { renderNotes } from "./vault.ts";

const FIXTURE = [
	"<!-- Generated from docs/v3/backlog/ -->",
	"# Checkable backlog",
	"",
	"### Story status",
	"",
	"| Priority | ID | Story | Status |",
	"|----------|----|-------|--------|",
	"| 1 | [S9](#s9--align-pnpm-dev-with-emulator-story-document--smoke) | Align `pnpm dev` | `todo` |",
	"| 2 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers *(pilot)* | `done` |",
	"",
	"---",
	"",
	"## Current baseline",
	"",
	"| Area | State |",
	"",
	"---",
	"",
	"## Stories",
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
	"---",
	"",
	"## Gap map (doc → story)",
	"",
].join("\n");

function notesFor(markdown: string): Map<string, string>
{
	return renderNotes(parseBacklog(markdown));
}

function edit(files: Map<string, string>, path: string, change: (content: string) => string): Map<string, string>
{
	const copy = new Map(files);
	copy.set(path, change(copy.get(path) ?? ""));
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
	it("round trip: import then build reproduces a fixture byte-for-byte", () =>
	{
		expect(assembleBacklog(notesFor(FIXTURE))).toBe(FIXTURE);
	});

	it("round trip: import then build reproduces the real BACKLOG.md byte-for-byte", () =>
	{
		const markdown = readFileSync(join(import.meta.dirname, "../../docs/v3/BACKLOG.md"), "utf8");
		expect(assembleBacklog(notesFor(markdown))).toBe(markdown);
	});

	it("writes a status edit into both the table row and the section's Status line", () =>
	{
		const out = assembleBacklog(edit(notesFor(FIXTURE), "stories/S1.md", (c) => c.replace("status: done", "status: blocked")));
		expect(out).toContain("| 2 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers *(pilot)* | `blocked` |");
		expect(out).toMatch(/stop after 8 turns\.\n\n\*\*Status:\*\* `blocked`/);
	});

	it("re-sorts the status table on a priority change", () =>
	{
		const out = assembleBacklog(edit(notesFor(FIXTURE), "stories/S9.md", (c) => c.replace("priority: 1", "priority: 3")));
		expect(out.split("\n").filter((l) => /^\| \d+ \| \[S/.test(l)).map((r) => r.slice(0, 11))).toEqual(["| 2 | [S1](", "| 3 | [S9]("]);
	});

	it("rejects a frame embed with no note, a note no frame embeds, and an id that doesn't match its file", () =>
	{
		const files = notesFor(FIXTURE);
		const missing = new Map(files);
		missing.delete("stories/S9.md");
		expect(() => assembleBacklog(missing)).toThrow(VaultAssembleError);
		expect(() => assembleBacklog(missing)).toThrow(/embeds S9, which has no story note/);

		const framePath = [...files.keys()].find((p) => (files.get(p) ?? "").includes("![[S9]]")) ?? "";
		expect(() => assembleBacklog(edit(files, framePath, (c) => c.replace("![[S9]]\n", "")))).toThrow(/not embedded in any frame note: S9/);

		expect(() => assembleBacklog(edit(files, "stories/S9.md", (c) => c.replace("id: S9", "id: S8")))).toThrow(/id 'S8' does not match the file name/);
	});
});

describe("buildFromNotes", () =>
{
	it("accepts Obsidian-style frontmatter and normalizes it without changing BACKLOG.md", () =>
	{
		const files = notesFor(FIXTURE);
		const obsidian = edit(files, "stories/S9.md", (c) => c
			.replace("depends_on:\n  - \"[[S1]]\"", "depends_on: [ '[[S1]]' ]")
			.replace("title: Align `pnpm dev` with emulator story (document + smoke)", "title: 'Align `pnpm dev` with emulator story (document + smoke)'"));
		expect(obsidian.get("stories/S9.md")).not.toBe(files.get("stories/S9.md"));

		const built = buildFromNotes(obsidian);
		expect(built.backlog).toBe(FIXTURE);
		expect(built.notes.get("stories/S9.md")).toBe(files.get("stories/S9.md"));
	});

	it("overwrites edits to derived fields from the body", () =>
	{
		const built = buildFromNotes(edit(notesFor(FIXTURE), "stories/S9.md", (c) => c.replace("turn_cap: 10", "turn_cap: 99")));
		expect(built.notes.get("stories/S9.md")).toContain("turn_cap: 10");
	});
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import {
	assembleBacklog, buildFromNotes, headingAnchor, nextStoryLine, reviewDebtLine, VaultAssembleError,
} from "./assemble.ts";
import {
	AUDIT, FIXTURE, notesFor,
} from "./fixture.ts";

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
		expect(assembleBacklog(notesFor(FIXTURE), AUDIT)).toBe(FIXTURE);
	});

	it("round trip: import then build reproduces the real BACKLOG.md byte-for-byte", () =>
	{
		const markdown = readFileSync(join(import.meta.dirname, "../../docs/v3/BACKLOG.md"), "utf8");
		const audit = readFileSync(join(import.meta.dirname, "../../docs/v3/AUDIT.md"), "utf8");
		expect(assembleBacklog(notesFor(markdown), audit)).toBe(markdown);
	});

	it("writes a status edit into both the table row and the section's Status line", () =>
	{
		const out = assembleBacklog(edit(notesFor(FIXTURE), "stories/S1.md", (c) => c.replace("status: done", "status: blocked")), AUDIT);
		expect(out).toContain("| 2 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers *(pilot)* | `blocked` |");
		expect(out).toMatch(/stop after 8 turns\.\n\n\*\*Status:\*\* `blocked`/);
	});

	it("re-sorts the status table on a priority change", () =>
	{
		const out = assembleBacklog(edit(notesFor(FIXTURE), "stories/S9.md", (c) => c.replace("priority: 1\n", "priority: 3\n")), AUDIT);
		expect(out.split("\n").filter((l) => /^\| \d+ \| \[S/.test(l)).map((r) => r.slice(0, 11))).toEqual(["| 2 | [S1](", "| 3 | [S9]("]);
	});

	it("rejects a frame embed with no note, a note no frame embeds, and an id that doesn't match its file", () =>
	{
		const files = notesFor(FIXTURE);
		const missing = new Map(files);
		missing.delete("stories/S9.md");
		expect(() => assembleBacklog(missing, AUDIT)).toThrow(VaultAssembleError);
		expect(() => assembleBacklog(missing, AUDIT)).toThrow(/embeds S9, which has no story note/);

		const framePath = [...files.keys()].find((p) => (files.get(p) ?? "").includes("![[S9]]")) ?? "";
		expect(() => assembleBacklog(edit(files, framePath, (c) => c.replace("![[S9]]\n", "")), AUDIT)).toThrow(/not embedded in any frame note: S9/);

		expect(() => assembleBacklog(edit(files, "stories/S9.md", (c) => c.replace("id: S9", "id: S8")), AUDIT)).toThrow(/id 'S8' does not match the file name/);
	});

	it("rejects a Status line or story heading written into a note body", () =>
	{
		const files = notesFor(FIXTURE);
		expect(() => assembleBacklog(edit(files, "stories/S9.md", (c) => `${c}\n**Status:** \`todo\`\n`), AUDIT)).toThrow(/must not contain "\*\*Status:\*\* `todo`"/);
		expect(() => assembleBacklog(edit(files, "stories/S9.md", (c) => `${c}\n### S9 — Again\n`), AUDIT)).toThrow(/must not contain "### S9 — Again"/);
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

		const built = buildFromNotes(obsidian, AUDIT);
		expect(built.backlog).toBe(FIXTURE);
		expect(built.notes.get("stories/S9.md")).toBe(files.get("stories/S9.md"));
	});

	it("overwrites edits to derived fields from the body", () =>
	{
		const built = buildFromNotes(edit(notesFor(FIXTURE), "stories/S9.md", (c) => c.replace("turn_cap: 10", "turn_cap: 99")), AUDIT);
		expect(built.notes.get("stories/S9.md")).toContain("turn_cap: 10");
	});
});

describe("generated lines", () =>
{
	const story = (id: string, priority: number, status: string) => ({
		id,
		priority,
		status,
	});

	it("names the story in progress, else the lowest-priority todo, else says none remain", () =>
	{
		expect(nextStoryLine([story("S2", 19, "todo"), story("S27", 16, "doing"), story("S25", 17, "todo")]))
			.toBe("**Next (generated):** **16 / S27** in progress (`doing`) — finish and commit before starting another story (rule 6).");
		expect(nextStoryLine([story("S2", 19, "todo"), story("S25", 17, "todo"), story("S1", 1, "done")]))
			.toBe("**Next (generated):** **17 / S25** — the lowest **Priority** with Status `todo`.");
		expect(nextStoryLine([story("S1", 1, "done")])).toBe("**Next (generated):** no `todo` stories remain.");
	});

	it("counts distinct stories completed since the newest review, ignoring re-verifications", () =>
	{
		expect(reviewDebtLine(AUDIT)).toContain("1 of 3 stories `done` since the last backlog review (2026-09-10, verdict `amended`): S1.");
		const due = `${AUDIT}## 2026-09-13 — S2 completed\n## 2026-09-13 — S3 completed\n`;
		expect(reviewDebtLine(due)).toContain("3 of 3 stories `done` since the last backlog review (2026-09-10, verdict `amended`): S1, S2, S3. **A review is due before the next story starts.**");
		expect(reviewDebtLine("## 2026-09-01 — S1 completed\n")).toContain("(no review logged yet): S1.");
	});

	it("follows the notes: a status flip moves the Next line", () =>
	{
		const out = assembleBacklog(edit(notesFor(FIXTURE), "stories/S9.md", (c) => c.replace("status: todo", "status: doing")), AUDIT);
		expect(out).toContain("**Next (generated):** **1 / S9** in progress (`doing`)");
	});

	it("refuses to build the review-debt line without AUDIT.md", () =>
	{
		expect(() => assembleBacklog(notesFor(FIXTURE))).toThrow(/no AUDIT\.md was provided/);
	});
});

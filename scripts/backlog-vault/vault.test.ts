import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import { parseBacklog } from "./parse.ts";
import {
	BANNER, renderStory, renderVault,
} from "./vault.ts";
import type { Story } from "./parse.ts";

const story: Story = {
	id: "S26",
	title: "Typed \"route\" contract",
	order: 4,
	section: "Stories",
	body: "\n**Depends on:** S21\n\n**Status:** `done`",
	status: "done",
	priority: 15,
	dependsOn: ["S21"],
	preferAfter: [],
	turnCap: null,
	scopeFiles: ["packages/domain/"],
};

describe("renderStory", () =>
{
	it("writes frontmatter, banner, heading, then the body verbatim", () =>
	{
		expect(renderStory(story)).toBe([
			"---",
			"id: S26",
			"title: \"Typed \\\"route\\\" contract\"",
			"priority: 15",
			"status: done",
			"order: 4",
			"section: \"Stories\"",
			"depends_on: [\"[[S21]]\"]",
			"prefer_after: []",
			"turn_cap: null",
			"scope_files: [\"packages/domain/\"]",
			"---",
			"",
			BANNER,
			"",
			"# S26 — Typed \"route\" contract",
			story.body,
			"",
		].join("\n"));
	});
});

describe("renderVault", () =>
{
	it("renders one note per story in the real backlog, plus the base and baseline", () =>
	{
		const markdown = readFileSync(join(import.meta.dirname, "../../docs/v3/BACKLOG.md"), "utf8");
		const backlog = parseBacklog(markdown);
		const files = renderVault(backlog);
		const headings = markdown.match(/^### S\d+ —/gm) ?? [];

		expect(backlog.stories).toHaveLength(headings.length);
		expect([...files.keys()].filter((p) => p.startsWith("stories/"))).toHaveLength(headings.length);
		expect(files.get("Backlog.base")).toContain("property: note.priority");
		expect(files.get("Baseline.md")).toContain("## Current baseline");
	});
});

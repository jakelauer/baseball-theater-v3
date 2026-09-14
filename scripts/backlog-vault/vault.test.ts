import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import { parseBacklog } from "./parse.ts";
import type { Story } from "./parse.ts";
import { renderNotes, renderStory } from "./vault.ts";

const story: Story = {
	id: "S26",
	title: "Typed *route* contract",
	tableTitle: "Typed route contract (`/api/v1`)",
	order: 4,
	section: "Stories",
	body: "\n**Depends on:** S21\n\n**Status:** `done`",
	status: "done",
	priority: 15,
	dependsOn: ["S21"],
	preferAfter: [],
	design: [],
	turnCap: null,
	scopeFiles: ["packages/domain/"],
};

describe("renderStory", () =>
{
	it("writes canonical YAML frontmatter, then the body without its heading or Status line", () =>
	{
		expect(renderStory(story)).toBe([
			"---",
			"id: S26",
			"title: Typed *route* contract",
			"table_title: Typed route contract (`/api/v1`)",
			"priority: 15",
			"status: done",
			"section: Stories",
			"order: 4",
			"depends_on:",
			"  - \"[[S21]]\"",
			"prefer_after: []",
			"design: []",
			"turn_cap: null",
			"scope_files:",
			"  - packages/domain/",
			"---",
			"",
			"**Depends on:** S21",
			"",
		].join("\n"));
	});

	it("refuses a body that is not blank, content, blank, Status", () =>
	{
		expect(() => renderStory({
			...story,
			body: "\n**Depends on:** S21\n**Status:** `done`",
		})).toThrow(/S26: body must be/);
	});
});

describe("renderNotes", () =>
{
	it("renders one note per story in the real backlog, plus frame notes", () =>
	{
		const markdown = readFileSync(join(import.meta.dirname, "../../docs/v3/BACKLOG.md"), "utf8");
		const files = renderNotes(parseBacklog(markdown));
		const headings = markdown.match(/^### S\d+ —/gm) ?? [];

		expect([...files.keys()].filter((p) => p.startsWith("stories/"))).toHaveLength(headings.length);
		expect([...files.keys()].some((p) => p.startsWith("frame/00 "))).toBe(true);
		for (const [path, content] of files)
		{
			if (path.startsWith("stories/"))
			{
				expect(content).not.toMatch(/^### S\d+ —|^\*\*Status:\*\*/m);
			}
		}
	});
});

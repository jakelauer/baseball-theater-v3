/**
 * Render a parsed backlog as Obsidian vault files (docs/v3/VAULT-MIGRATION.md, V1–V2).
 * Pure: returns path → content; the CLI does the writing.
 */

import type {
	Backlog, FramePart, Story,
} from "./parse.ts";

export const BANNER = "> [!warning] Generated from `docs/v3/BACKLOG.md` — edit there, not here. This file is overwritten on every commit, merge, and checkout.";

function yamlString(value: string): string
{
	return JSON.stringify(value);
}

function yamlLinks(ids: string[]): string
{
	return `[${ids.map((id) => yamlString(`[[${id}]]`)).join(", ")}]`;
}

function yamlList(values: string[]): string
{
	return `[${values.map(yamlString).join(", ")}]`;
}

export function renderStory(story: Story): string
{
	return [
		"---",
		`id: ${story.id}`,
		`title: ${yamlString(story.title)}`,
		`table_title: ${yamlString(story.tableTitle)}`,
		`priority: ${story.priority}`,
		`status: ${story.status}`,
		`order: ${story.order}`,
		`section: ${yamlString(story.section)}`,
		`depends_on: ${yamlLinks(story.dependsOn)}`,
		`prefer_after: ${yamlLinks(story.preferAfter)}`,
		`turn_cap: ${story.turnCap ?? "null"}`,
		`scope_files: ${yamlList(story.scopeFiles)}`,
		"---",
		"",
		BANNER,
		"",
		`# ${story.id} — ${story.title}`,
		// The body keeps the blank line that follows the heading in BACKLOG.md.
		story.body,
		"",
	].join("\n");
}

/** Obsidian Bases views over the story notes. */
export const BACKLOG_BASE = `filters:
  and:
    - file.inFolder("stories")
properties:
  note.title:
    displayName: Title
  note.priority:
    displayName: Priority
  note.status:
    displayName: Status
  note.turn_cap:
    displayName: Turn cap
  note.depends_on:
    displayName: Depends on
  note.section:
    displayName: Section
views:
  - type: table
    name: All stories
    order:
      - file.name
      - note.title
      - note.status
      - note.priority
      - note.turn_cap
      - note.depends_on
    sort:
      - property: note.priority
        direction: ASC
  - type: table
    name: Remaining
    filters:
      and:
        - 'status != "done"'
    order:
      - file.name
      - note.title
      - note.status
      - note.priority
      - note.depends_on
    sort:
      - property: note.priority
        direction: ASC
  - type: table
    name: By status
    groupBy:
      property: note.status
      direction: ASC
    order:
      - file.name
      - note.title
      - note.priority
    sort:
      - property: note.priority
        direction: ASC
`;

/** `frame/NN <heading>.md` — zero-padded so file order is assembly order. */
export function framePath(part: FramePart, index: number): string
{
	const name = part.heading.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
	return `frame/${String(index).padStart(2, "0")} ${name}.md`;
}

export function renderFrame(part: FramePart): string
{
	return `${BANNER}\n\n${part.text}`;
}

export function renderVault(backlog: Backlog): Map<string, string>
{
	const files = new Map<string, string>();
	for (const story of backlog.stories)
	{
		files.set(`stories/${story.id}.md`, renderStory(story));
	}
	backlog.frame.forEach((part, i) => files.set(framePath(part, i), renderFrame(part)));
	files.set("Backlog.base", BACKLOG_BASE);
	files.set("Baseline.md", `${BANNER}\n\n${backlog.baseline}\n`);
	return files;
}

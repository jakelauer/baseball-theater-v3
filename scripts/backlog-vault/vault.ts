/**
 * Render a parsed backlog as the editable Obsidian notes under docs/v3/backlog/
 * (docs/v3/VAULT-MIGRATION.md, V3). Pure: returns path → content; the CLI writes.
 *
 * A story note holds only what isn't derivable: frontmatter plus the story body without
 * its `### S<N> — …` heading and `**Status:**` line (both rebuilt from frontmatter).
 */

import { stringify } from "yaml";
import type {
	Backlog, FramePart, Story,
} from "./parse.ts";

const STATUS_LINE = /^\*\*Status:\*\* `[a-z]+`$/;

/**
 * The editable part of a story body. BACKLOG.md lays every story out as a blank line,
 * the content, a blank line, and the Status line; anything else is refused rather than
 * silently reshaped.
 */
export function storyContent(story: Story): string
{
	const lines = story.body.split("\n");
	const n = lines.length;
	if (n < 4 || lines[0] !== "" || lines[1] === "" || lines[n - 2] !== "" || lines[n - 3] === "" || !STATUS_LINE.test(lines[n - 1] ?? ""))
	{
		throw new Error(`${story.id}: body must be a blank line, content, a blank line, then the **Status:** line`);
	}
	return lines.slice(1, -2).join("\n");
}

export function renderStory(story: Story): string
{
	const frontmatter = stringify({
		// Authoritative — edit these.
		id: story.id,
		title: story.title,
		table_title: story.tableTitle,
		priority: story.priority,
		status: story.status,
		// Derived by `pnpm backlog:build` from the frame and the body — edits are overwritten.
		section: story.section,
		order: story.order,
		depends_on: story.dependsOn.map((id) => `[[${id}]]`),
		prefer_after: story.preferAfter.map((id) => `[[${id}]]`),
		design: story.design.map((id) => `[[${id}]]`),
		turn_cap: story.turnCap,
		scope_files: story.scopeFiles,
	}, {
		lineWidth: 0,
	});
	return `---\n${frontmatter}---\n\n${storyContent(story)}\n`;
}

/** Obsidian Bases views over the story notes. Written once if missing; yours to edit after. */
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

/** Every story note and frame note, canonically formatted. */
export function renderNotes(backlog: Backlog): Map<string, string>
{
	const files = new Map<string, string>();
	for (const story of backlog.stories)
	{
		files.set(`stories/${story.id}.md`, renderStory(story));
	}
	backlog.frame.forEach((part, i) => files.set(framePath(part, i), part.text));
	return files;
}

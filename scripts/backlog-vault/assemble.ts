/**
 * Build `BACKLOG.md` from the notes under docs/v3/backlog/ (docs/v3/VAULT-MIGRATION.md, V3).
 * Pure: path → content in, markdown + canonical notes out.
 */

import { parse as parseYaml } from "yaml";
import {
	GENERATED_LINES, parseBacklog, STATUS_TABLE_MARKER,
} from "./parse.ts";
import { renderNotes } from "./vault.ts";

export class VaultAssembleError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = "VaultAssembleError";
	}
}

interface StoryNote
{
	id: string;
	title: string;
	tableTitle: string;
	priority: number;
	status: string;
	content: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n?---\n/;

function readStoryNote(path: string, content: string): StoryNote
{
	const fail = (why: string) => new VaultAssembleError(`${path}: ${why}`);
	const match = FRONTMATTER.exec(content);
	if (!match)
	{
		throw fail("no frontmatter");
	}
	let data: unknown;
	try
	{
		data = parseYaml(match[1] ?? "");
	}
	catch (error)
	{
		throw fail(`frontmatter is not valid YAML: ${(error as Error).message}`);
	}
	const fields = (data ?? {}) as Record<string, unknown>;

	const text = (key: string) =>
	{
		const value = fields[key];
		if (typeof value !== "string" || value === "")
		{
			throw fail(`frontmatter '${key}' must be a non-empty string`);
		}
		return value;
	};

	const id = text("id");
	const fileId = /(S\d+)\.md$/.exec(path)?.[1];
	if (id !== fileId)
	{
		throw fail(`frontmatter id '${id}' does not match the file name`);
	}
	const priority = fields.priority;
	if (typeof priority !== "number" || !Number.isInteger(priority))
	{
		throw fail("frontmatter 'priority' must be an integer");
	}
	const status = text("status");
	if (!/^[a-z]+$/.test(status))
	{
		throw fail(`frontmatter 'status' must be a lowercase word, got '${status}'`);
	}

	const body = content.slice(match[0].length).replace(/^\n+/, "").replace(/\s+$/, "");
	if (body === "")
	{
		throw fail("story body is empty");
	}
	// The build writes these from frontmatter; a copy in the body would silently disagree with it.
	const duplicate = /^(### S\d+ —|\*\*Status:\*\*).*$/m.exec(body);
	if (duplicate)
	{
		throw fail(`story body must not contain "${duplicate[0]}" — the build writes the heading and Status line from frontmatter`);
	}
	return {
		id,
		title: text("title"),
		tableTitle: text("table_title"),
		priority,
		status,
		content: body,
	};
}

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
export function headingAnchor(heading: string): string
{
	return heading.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/ /g, "-");
}

function statusRow(story: StoryNote): string
{
	return `| ${story.priority} | [${story.id}](#${headingAnchor(`${story.id} — ${story.title}`)}) | ${story.tableTitle} | \`${story.status}\` |`;
}

function storySection(story: StoryNote): string
{
	return `### ${story.id} — ${story.title}\n\n${story.content}\n\n**Status:** \`${story.status}\``;
}

/** Review debt is due at this many `done` stories since the last review (BACKLOG rule 11). */
const REVIEW_BACKSTOP = 3;

/** `**Next (generated):**` — the story in progress, else the lowest-priority `todo`. */
export function nextStoryLine(stories: { id: string;
	priority: number;
	status: string }[]): string
{
	const byPriority = [...stories].sort((a, b) => a.priority - b.priority);
	const doing = byPriority.filter((s) => s.status === "doing");
	const todo = byPriority.find((s) => s.status === "todo");
	let text: string;
	if (doing.length > 0)
	{
		text = `${doing.map((s) => `**${s.priority} / ${s.id}**`).join(", ")} in progress (\`doing\`) — finish and commit before starting another story (rule 6).`;
	}
	else if (todo)
	{
		text = `**${todo.priority} / ${todo.id}** — the lowest **Priority** with Status \`todo\`.`;
	}
	else
	{
		text = "no `todo` stories remain.";
	}
	return `${GENERATED_LINES.next.prefix}${text}`;
}

/** `**Review debt (generated …):**` — stories completed since the newest review entry in AUDIT.md. */
export function reviewDebtLine(audit: string): string
{
	const headings = audit.split("\n").filter((l) => l.startsWith("## "));
	let lastReview: RegExpExecArray | null = null;
	let since: string[] = [];
	for (const heading of headings)
	{
		const review = /^## (\S+) — backlog review \(`([a-z]+)`\)$/.exec(heading);
		if (review)
		{
			lastReview = review;
			since = [];
			continue;
		}
		const completed = /^## \S+ — (S\d+) completed$/.exec(heading)?.[1];
		if (completed && !since.includes(completed))
		{
			since.push(completed);
		}
	}
	const count = `${since.length} of ${REVIEW_BACKSTOP} stories \`done\` since the last backlog review`;
	const when = lastReview ? ` (${lastReview[1]}, verdict \`${lastReview[2]}\`)` : " (no review logged yet)";
	const which = since.length > 0 ? `: ${since.join(", ")}` : "";
	const verdict = since.length >= REVIEW_BACKSTOP
		? " **A review is due before the next story starts.**"
		: " A drift event makes a review due regardless of this count.";
	return `${GENERATED_LINES.reviewDebt.prefix}${count}${when}${which}.${verdict}`;
}

/** `audit` is docs/v3/AUDIT.md; required only when a frame note carries the review-debt marker. */
export function assembleBacklog(files: Map<string, string>, audit?: string): string
{
	const stories = new Map<string, StoryNote>();
	for (const [path, content] of files)
	{
		if (/^stories\/S\d+\.md$/.test(path))
		{
			const note = readStoryNote(path, content);
			stories.set(note.id, note);
		}
	}

	const frameLines = [...files.keys()]
		.filter((path) => /^frame\/\d+ .*\.md$/.test(path))
		.sort()
		.map((path) => files.get(path) ?? "")
		.join("\n")
		.split("\n");
	if (frameLines.length <= 1)
	{
		throw new VaultAssembleError("no frame notes");
	}

	const embedOrder: string[] = [];
	for (const line of frameLines)
	{
		const id = /^!\[\[(S\d+)\]\]$/.exec(line)?.[1];
		if (id === undefined)
		{
			continue;
		}
		if (!stories.has(id))
		{
			throw new VaultAssembleError(`frame embeds ${id}, which has no story note`);
		}
		if (embedOrder.includes(id))
		{
			throw new VaultAssembleError(`frame embeds ${id} more than once`);
		}
		embedOrder.push(id);
	}
	const orphans = [...stories.keys()].filter((id) => !embedOrder.includes(id));
	if (orphans.length > 0)
	{
		throw new VaultAssembleError(`story notes not embedded in any frame note: ${orphans.join(", ")}`);
	}

	const rows = embedOrder
		.map((id, order) => ({
			note: stories.get(id) as StoryNote,
			order,
		}))
		.sort((a, b) => a.note.priority - b.note.priority || a.order - b.order)
		.map(({ note }) => statusRow(note));

	return frameLines.map((line) =>
	{
		if (line === STATUS_TABLE_MARKER)
		{
			return rows.join("\n");
		}
		if (line === GENERATED_LINES.next.marker)
		{
			return nextStoryLine([...stories.values()]);
		}
		if (line === GENERATED_LINES.reviewDebt.marker)
		{
			if (audit === undefined)
			{
				throw new VaultAssembleError("a frame note needs the review-debt line, but no AUDIT.md was provided");
			}
			return reviewDebtLine(audit);
		}
		const id = /^!\[\[(S\d+)\]\]$/.exec(line)?.[1];
		return id === undefined ? line : storySection(stories.get(id) as StoryNote);
	}).join("\n");
}

/** What `pnpm backlog:build` writes: BACKLOG.md, and every note in canonical form with derived fields refreshed. */
export interface BuiltBacklog
{
	backlog: string;
	notes: Map<string, string>;
}

export function buildFromNotes(files: Map<string, string>, audit?: string): BuiltBacklog
{
	const backlog = assembleBacklog(files, audit);
	return {
		backlog,
		notes: renderNotes(parseBacklog(backlog)),
	};
}

/**
 * Rebuild `BACKLOG.md` from rendered vault files alone (docs/v3/VAULT-MIGRATION.md, V2).
 * Pure: path → content in, markdown out. Never reads the source backlog — the point
 * is to prove the notes carry everything.
 */

import { STATUS_TABLE_MARKER, storyEmbed } from "./parse.ts";
import { BANNER } from "./vault.ts";

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
	order: number;
	body: string;
}

/** Values are written as JSON (strings, numbers, null, flow lists) or bare words. */
function parseFrontmatterValue(raw: string): unknown
{
	return /^["[\d-]|^null$|^true$|^false$/.test(raw) ? JSON.parse(raw) : raw;
}

function readStoryNote(path: string, content: string): StoryNote
{
	const fail = (why: string) => new VaultAssembleError(`${path}: ${why}`);
	if (!content.startsWith("---\n"))
	{
		throw fail("no frontmatter");
	}
	const end = content.indexOf("\n---\n", 4);
	if (end === -1)
	{
		throw fail("unterminated frontmatter");
	}
	const fields = new Map<string, unknown>();
	for (const line of content.slice(4, end).split("\n"))
	{
		const colon = line.indexOf(": ");
		if (colon === -1)
		{
			throw fail(`unreadable frontmatter line: ${line}`);
		}
		fields.set(line.slice(0, colon), parseFrontmatterValue(line.slice(colon + 2)));
	}

	const str = (key: string) =>
	{
		const value = fields.get(key);
		if (typeof value !== "string")
		{
			throw fail(`frontmatter '${key}' is not a string`);
		}
		return value;
	};
	const num = (key: string) =>
	{
		const value = fields.get(key);
		if (typeof value !== "number")
		{
			throw fail(`frontmatter '${key}' is not a number`);
		}
		return value;
	};

	const id = str("id");
	const title = str("title");
	const prefix = `\n${BANNER}\n\n# ${id} — ${title}\n`;
	const rest = content.slice(end + "\n---\n".length);
	if (!rest.startsWith(prefix) || !rest.endsWith("\n"))
	{
		throw fail("body does not start with the banner and `# <id> — <title>` heading");
	}
	return {
		id,
		title,
		tableTitle: str("table_title"),
		priority: num("priority"),
		status: str("status"),
		order: num("order"),
		body: rest.slice(prefix.length, -1),
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

export function assembleBacklog(files: Map<string, string>): string
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

	const framePrefix = `${BANNER}\n\n`;
	const frame = [...files.keys()]
		.filter((path) => /^frame\/\d+ .*\.md$/.test(path))
		.sort()
		.map((path) =>
		{
			const content = files.get(path) ?? "";
			if (!content.startsWith(framePrefix))
			{
				throw new VaultAssembleError(`${path}: frame note does not start with the banner`);
			}
			return content.slice(framePrefix.length);
		});
	if (frame.length === 0)
	{
		throw new VaultAssembleError("vault has no frame notes");
	}

	const rows = [...stories.values()]
		.sort((a, b) => a.priority - b.priority || a.order - b.order)
		.map(statusRow);

	const embedded = new Set<string>();
	const out = frame.join("\n").split("\n").map((line) =>
	{
		if (line === STATUS_TABLE_MARKER)
		{
			return rows.join("\n");
		}
		const id = /^!\[\[(S\d+)\]\]$/.exec(line)?.[1];
		if (id === undefined)
		{
			return line;
		}
		const story = stories.get(id);
		if (!story || line !== storyEmbed(id))
		{
			throw new VaultAssembleError(`frame embeds ${id}, which has no story note`);
		}
		if (embedded.has(id))
		{
			throw new VaultAssembleError(`frame embeds ${id} more than once`);
		}
		embedded.add(id);
		const heading = `### ${id} — ${story.title}`;
		return story.body === "" ? heading : `${heading}\n${story.body}`;
	});

	const orphans = [...stories.keys()].filter((id) => !embedded.has(id));
	if (orphans.length > 0)
	{
		throw new VaultAssembleError(`story notes not embedded in any frame note: ${orphans.join(", ")}`);
	}
	return out.join("\n");
}

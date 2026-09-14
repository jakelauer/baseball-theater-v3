/**
 * Parse `docs/v3/BACKLOG.md` into structured stories plus the frame around them,
 * for the Obsidian vault (docs/v3/VAULT-MIGRATION.md, V1–V2). Pure: text in, data out.
 */

export interface StatusRow
{
	priority: number;
	id: string;
	title: string;
	status: string;
}

export interface Story
{
	id: string;
	/** Title from the `### S<N> — <title>` heading, exactly as written. */
	title: string;
	/** Title as written in the Story status table (may differ from the heading). */
	tableTitle: string;
	/** 1-based position among story headings in the file. */
	order: number;
	/** The enclosing `## ` heading. */
	section: string;
	/** Section text between the heading and the next `---` / `## ` / `### ` line, trailing blanks trimmed. */
	body: string;
	status: string;
	priority: number;
	dependsOn: string[];
	preferAfter: string[];
	turnCap: number | null;
	scopeFiles: string[];
}

/** A slice of BACKLOG.md starting at a `## ` heading (or the file start), with stories and status rows swapped for placeholders. */
export interface FramePart
{
	heading: string;
	text: string;
}

export interface Backlog
{
	stories: Story[];
	/** Every non-story line of the file, in order; `parts.map(p => p.text).join("\n")` is the whole frame. */
	frame: FramePart[];
	/** The Current baseline section, heading included, up to its closing `---`. */
	baseline: string;
}

export class BacklogParseError extends Error
{
	readonly problems: string[];

	constructor(problems: string[])
	{
		super(`BACKLOG.md does not parse:\n- ${problems.join("\n- ")}`);
		this.name = "BacklogParseError";
		this.problems = problems;
	}
}

/** Frame line standing in for the status table rows; embeds the Bases table in Obsidian. */
export const STATUS_TABLE_MARKER = "![[Backlog.base#All stories]]";

/**
 * Frame lines (Obsidian comments, hidden when rendered) that the build replaces with a
 * generated line, keyed by the prefix that generated line starts with in BACKLOG.md.
 */
export const GENERATED_LINES = {
	next: {
		marker: "%% generated: next story %%",
		prefix: "**Next (generated):** ",
	},
	reviewDebt: {
		marker: "%% generated: review debt %%",
		prefix: "**Review debt (generated from [AUDIT](./AUDIT.md)):** ",
	},
} as const;

/** Frame line standing in for one story section; embeds the story note in Obsidian. */
export function storyEmbed(id: string): string
{
	return `![[${id}]]`;
}

const STATUS_ROW = /^\| (\d+) \| \[(S\d+)\]\([^)]*\) \| (.*) \| `([a-z]+)` \|$/;
const STORY_HEADING = /^### (S\d+) — (.+)$/;

function isSectionEnd(line: string): boolean
{
	return line === "---" || line.startsWith("## ") || line.startsWith("### ");
}

function trimTrailingBlankLines(lines: string[]): string[]
{
	let end = lines.length;
	while (end > 0 && lines[end - 1]?.trim() === "")
	{
		end--;
	}
	return lines.slice(0, end);
}

/** The text after a `**Label:**` line prefix, or `undefined` when no line has it. */
function fieldLine(lines: string[], label: string): string | undefined
{
	const prefix = `**${label}:**`;
	const line = lines.find((l) => l.startsWith(prefix));
	return line === undefined ? undefined : line.slice(prefix.length).trim();
}

/** Words after which a story mention is not a dependency ("Does **not** depend on S21", "Sibling to S13"). */
const NOT_A_DEPENDENCY = /\bnot\b|\bno longer\b|\bindependent of\b|\bwithout\b|\bsibling\b/i;

/**
 * Story IDs a `Depends on` / `Prefer after` line actually depends on, in order. Each sentence
 * or `;` clause counts only the IDs before its first negating word, so explanations like
 * "S21 (not only raw snapshots)" keep S21 while "Does not depend on S21" drops it.
 */
export function storyIds(text: string | undefined): string[]
{
	if (text === undefined)
	{
		return [];
	}
	const clauses = text.split(/(?<=\.)\s+(?=[A-Z*])|;\s*/);
	return [...new Set(clauses.flatMap((clause) =>
	{
		// A negation inside parentheses qualifies an aside ("if day hub not built yet"), not the clause.
		let outsideParens = clause;
		for (let previous = ""; previous !== outsideParens;)
		{
			previous = outsideParens;
			outsideParens = outsideParens.replace(/\([^()]*\)/g, (m) => " ".repeat(m.length));
		}
		const negation = NOT_A_DEPENDENCY.exec(outsideParens);
		return (negation ? clause.slice(0, negation.index) : clause).match(/\bS\d+\b/g) ?? [];
	}))];
}

function parseBaseline(lines: string[]): string
{
	const start = lines.findIndex((l) => l.startsWith("## Current baseline"));
	if (start === -1)
	{
		return "";
	}
	const rest = lines.slice(start);
	const end = rest.findIndex((l, i) => i > 0 && l === "---");
	return trimTrailingBlankLines(end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function splitFrame(lines: string[]): FramePart[]
{
	const parts: FramePart[] = [];
	let current: string[] = [];
	const flush = () =>
	{
		const heading = current.map((l) => /^#{1,2} (.+)$/.exec(l)?.[1]).find((h) => h !== undefined);
		parts.push({
			heading: heading ?? "Preamble",
			text: current.join("\n"),
		});
	};
	lines.forEach((line, i) =>
	{
		if (i > 0 && line.startsWith("## "))
		{
			flush();
			current = [];
		}
		current.push(line);
	});
	flush();
	return parts;
}

export function parseBacklog(markdown: string): Backlog
{
	const lines = markdown.split("\n");
	const problems: string[] = [];

	const rowIndexes: number[] = [];
	const table: StatusRow[] = [];
	lines.forEach((line, i) =>
	{
		const match = STATUS_ROW.exec(line);
		if (match)
		{
			rowIndexes.push(i);
			table.push({
				priority: Number(match[1]),
				id: match[2] ?? "",
				title: match[3] ?? "",
				status: match[4] ?? "",
			});
		}
	});
	if (rowIndexes.some((index, i) => i > 0 && index !== (rowIndexes[i - 1] ?? 0) + 1))
	{
		problems.push("status table rows are not contiguous");
	}
	const tableById = new Map(table.map((row) => [row.id, row]));

	const stories: Story[] = [];
	/** Line index → [lines consumed, placeholder line]. */
	const replacements = new Map<number, [number, string]>();
	if (rowIndexes.length > 0)
	{
		replacements.set(rowIndexes[0] ?? 0, [rowIndexes.length, STATUS_TABLE_MARKER]);
	}
	lines.forEach((line, i) =>
	{
		for (const generated of Object.values(GENERATED_LINES))
		{
			if (line.startsWith(generated.prefix))
			{
				replacements.set(i, [1, generated.marker]);
			}
		}
	});

	let section = "";
	for (let i = 0; i < lines.length; i++)
	{
		const line = lines[i] ?? "";
		if (line.startsWith("## "))
		{
			section = line.slice(3).trim();
			continue;
		}
		const heading = STORY_HEADING.exec(line);
		if (!heading)
		{
			continue;
		}

		const id = heading[1] ?? "";
		const bodyLines: string[] = [];
		for (let j = i + 1; j < lines.length && !isSectionEnd(lines[j] ?? ""); j++)
		{
			bodyLines.push(lines[j] ?? "");
		}
		const body = trimTrailingBlankLines(bodyLines);
		replacements.set(i, [1 + body.length, storyEmbed(id)]);

		const status = /^`([a-z]+)`$/.exec(fieldLine(body, "Status") ?? "")?.[1];
		const row = tableById.get(id);
		if (status === undefined)
		{
			problems.push(`${id} has no **Status:** line`);
		}
		if (!row)
		{
			problems.push(`${id} has a story section but is not in the status table`);
		}
		else if (status !== undefined && row.status !== status)
		{
			problems.push(`${id} status mismatch: table says \`${row.status}\`, section says \`${status}\``);
		}

		const turnCapLine = /^(\d+)\b/.exec(fieldLine(body, "Turn cap") ?? "")?.[1];
		const goalCap = /stop after (\d+) turns/.exec(fieldLine(body, "Goal condition") ?? "")?.[1];
		const cap = turnCapLine ?? goalCap;

		stories.push({
			id,
			title: heading[2] ?? "",
			tableTitle: row?.title ?? "",
			order: stories.length + 1,
			section,
			body: body.join("\n"),
			status: status ?? "",
			priority: row?.priority ?? 0,
			dependsOn: storyIds(fieldLine(body, "Depends on")),
			preferAfter: storyIds(fieldLine(body, "Prefer after")),
			turnCap: cap === undefined ? null : Number(cap),
			scopeFiles: [...(fieldLine(body, "Scope files") ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? ""),
		});
		i += body.length;
	}

	const sectionIds = new Set(stories.map((s) => s.id));
	for (const row of table)
	{
		if (!sectionIds.has(row.id))
		{
			problems.push(`${row.id} is in the status table but has no story section`);
		}
	}
	if (stories.length === 0)
	{
		problems.push("no `### S<N> — …` story headings found");
	}

	if (problems.length > 0)
	{
		throw new BacklogParseError(problems);
	}

	const frameLines: string[] = [];
	for (let i = 0; i < lines.length; i++)
	{
		const replacement = replacements.get(i);
		if (replacement)
		{
			frameLines.push(replacement[1]);
			i += replacement[0] - 1;
		}
		else
		{
			frameLines.push(lines[i] ?? "");
		}
	}

	return {
		stories,
		frame: splitFrame(frameLines),
		baseline: parseBaseline(lines),
	};
}

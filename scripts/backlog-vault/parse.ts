/**
 * Parse `docs/v3/BACKLOG.md` into structured stories for the Obsidian vault
 * (docs/v3/VAULT-MIGRATION.md, V1). Pure: text in, data out.
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
	/** Title from the `### S<N> — <title>` heading. */
	title: string;
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

export interface Backlog
{
	stories: Story[];
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

function storyIds(text: string | undefined): string[]
{
	if (text === undefined)
	{
		return [];
	}
	return [...new Set(text.match(/\bS\d+\b/g) ?? [])];
}

function parseStatusTable(lines: string[]): StatusRow[]
{
	const rows: StatusRow[] = [];
	for (const line of lines)
	{
		const match = STATUS_ROW.exec(line);
		if (match)
		{
			rows.push({
				priority: Number(match[1]),
				id: match[2] ?? "",
				title: match[3] ?? "",
				status: match[4] ?? "",
			});
		}
	}
	return rows;
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

export function parseBacklog(markdown: string): Backlog
{
	const lines = markdown.split("\n");
	const table = parseStatusTable(lines);
	const tableById = new Map(table.map((row) => [row.id, row]));
	const problems: string[] = [];
	const stories: Story[] = [];

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
			title: (heading[2] ?? "").trim(),
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
	return {
		stories,
		baseline: parseBaseline(lines),
	};
}

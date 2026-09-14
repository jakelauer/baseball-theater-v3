/**
 * The backlog's Obsidian notes (docs/v3/VAULT-MIGRATION.md, V3).
 *
 *   pnpm backlog:build    notes → docs/v3/BACKLOG.md; rewrite notes canonically (derived fields refreshed)
 *   pnpm backlog:check    exit 1 if build would change anything; --backlog-only compares BACKLOG.md alone
 *   pnpm backlog:import   recovery: regenerate the notes from docs/v3/BACKLOG.md
 *   cli.ts pre-commit     (the Husky hook) build from the index and re-stage; refuse hand edits of BACKLOG.md
 *
 * `--dir <notes dir>` (default docs/v3/backlog), `--backlog <file>` (default docs/v3/BACKLOG.md),
 * and `--audit <file>` (default docs/v3/AUDIT.md, read for the generated review-debt line) let
 * graders and hooks work on copies. Everything is computed in
 * memory first, so a note that fails to parse changes nothing on disk.
 */

import {
	access, mkdir, readdir, readFile, rm, writeFile,
} from "node:fs/promises";
import {
	dirname, join, resolve,
} from "node:path";
import { parseArgs } from "node:util";
import { buildFromNotes } from "./assemble.ts";
import { parseBacklog } from "./parse.ts";
import { runPrecommit } from "./precommit.ts";
import { BACKLOG_BASE, renderNotes } from "./vault.ts";

const repoRoot = resolve(import.meta.dirname, "../..");

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		dir: {
			type: "string",
			default: join(repoRoot, "docs/v3/backlog"),
		},
		backlog: {
			type: "string",
			default: join(repoRoot, "docs/v3/BACKLOG.md"),
		},
		audit: {
			type: "string",
			default: join(repoRoot, "docs/v3/AUDIT.md"),
		},
		"backlog-only": {
			type: "boolean",
			default: false,
		},
		quiet: {
			type: "boolean",
			default: false,
		},
	},
});

const dir = resolve(values.dir);
const backlogPath = resolve(values.backlog);
const auditPath = resolve(values.audit);

async function readAudit(): Promise<string | undefined>
{
	return readFile(auditPath, "utf8").catch(() => undefined);
}

function log(message: string)
{
	if (!values.quiet)
	{
		console.log(`backlog: ${message}`);
	}
}

async function exists(path: string): Promise<boolean>
{
	return access(path).then(() => true, () => false);
}

/** Story and frame notes on disk, keyed like the rendered map (`stories/S1.md`). */
async function readNotes(): Promise<Map<string, string>>
{
	const files = new Map<string, string>();
	for (const sub of ["stories", "frame"])
	{
		const names = await readdir(join(dir, sub)).catch(() => [] as string[]);
		for (const name of names.sort())
		{
			if (name.endsWith(".md"))
			{
				files.set(`${sub}/${name}`, await readFile(join(dir, sub, name), "utf8"));
			}
		}
	}
	return files;
}

/** Write `wanted`, removing story/frame notes it no longer contains (a renamed frame heading, a removed story). */
async function writeNotes(current: Map<string, string>, wanted: Map<string, string>)
{
	for (const path of current.keys())
	{
		if (!wanted.has(path))
		{
			await rm(join(dir, path));
			log(`removed ${path}`);
		}
	}
	for (const [path, content] of wanted)
	{
		if (current.get(path) !== content)
		{
			await mkdir(dirname(join(dir, path)), {
				recursive: true,
			});
			await writeFile(join(dir, path), content);
		}
	}
	if (!(await exists(join(dir, "Backlog.base"))))
	{
		await writeFile(join(dir, "Backlog.base"), BACKLOG_BASE);
	}
}

async function build()
{
	const notes = await readNotes();
	const built = buildFromNotes(notes, await readAudit());
	await writeNotes(notes, built.notes);
	await writeFile(backlogPath, built.backlog);
	log(`built ${backlogPath} from ${built.notes.size} notes`);
}

async function check()
{
	const notes = await readNotes();
	const built = buildFromNotes(notes, await readAudit());
	const stale: string[] = [];
	if ((await readFile(backlogPath, "utf8").catch(() => undefined)) !== built.backlog)
	{
		stale.push(backlogPath);
	}
	if (!values["backlog-only"])
	{
		for (const path of new Set([...notes.keys(), ...built.notes.keys()]))
		{
			if (notes.get(path) !== built.notes.get(path))
			{
				stale.push(join(dir, path));
			}
		}
	}
	if (stale.length > 0)
	{
		console.error(`backlog: out of date — run pnpm backlog:build. Would change:\n  ${stale.join("\n  ")}`);
		process.exitCode = 1;
		return;
	}
	log("notes and BACKLOG.md are in sync");
}

async function importBacklog()
{
	const wanted = renderNotes(parseBacklog(await readFile(backlogPath, "utf8")));
	await writeNotes(await readNotes(), wanted);
	log(`imported ${wanted.size} notes into ${dir} from ${backlogPath}`);
}

async function preCommit()
{
	const result = runPrecommit(repoRoot);
	if (!result.ok)
	{
		console.error(`pre-commit: ${result.message}`);
		process.exitCode = 1;
		return;
	}
	if (result.restaged.length > 0)
	{
		log(`rebuilt and re-staged ${result.restaged.join(", ")}`);
	}
}

const commands: Record<string, () => Promise<void>> = {
	build,
	check,
	import: importBacklog,
	"pre-commit": preCommit,
};

// lint-staged and hooks may append file paths; only the first positional is the command.
const command = commands[positionals[0] ?? ""];
if (!command)
{
	console.error("usage: cli.ts <build|check|import|pre-commit> [--dir <notes dir>] [--backlog <file>] [--audit <file>] [--backlog-only] [--quiet]");
	process.exitCode = 2;
}
else
{
	try
	{
		await command();
	}
	catch (error)
	{
		console.error(`backlog: ${(error as Error).message}`);
		process.exitCode = 1;
	}
}

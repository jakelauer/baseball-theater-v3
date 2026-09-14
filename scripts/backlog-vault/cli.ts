/**
 * Obsidian backlog vault (docs/v3/VAULT-MIGRATION.md, V1–V2).
 *
 *   pnpm backlog:vault [--out <dir>] [--quiet]        regenerate the read-only vault
 *   pnpm backlog:vault --roundtrip --to <file>         source → vault → <file>; exit 1 unless byte-identical
 *   pnpm backlog:vault --from-vault <dir> --to <file>  assemble BACKLOG.md from a vault on disk
 *
 * `--backlog <file>` picks the source (default docs/v3/BACKLOG.md). Everything is
 * rendered in memory first, so a backlog that fails to parse leaves the existing
 * vault untouched. Obsidian's own `.obsidian/` settings are never removed.
 */

import {
	chmod, mkdir, readdir, readFile, rm, writeFile,
} from "node:fs/promises";
import {
	dirname, join, relative, resolve, sep,
} from "node:path";
import { parseArgs } from "node:util";
import { assembleBacklog } from "./assemble.ts";
import { parseBacklog } from "./parse.ts";
import { renderVault } from "./vault.ts";

const repoRoot = resolve(import.meta.dirname, "../..");

const { values } = parseArgs({
	options: {
		backlog: {
			type: "string",
			default: join(repoRoot, "docs/v3/BACKLOG.md"),
		},
		out: {
			type: "string",
			default: join(repoRoot, ".backlog-vault"),
		},
		roundtrip: {
			type: "boolean",
			default: false,
		},
		"from-vault": {
			type: "string",
		},
		to: {
			type: "string",
		},
		quiet: {
			type: "boolean",
			default: false,
		},
	},
});

function log(message: string)
{
	if (!values.quiet)
	{
		console.log(`backlog-vault: ${message}`);
	}
}

async function readVaultDir(dir: string): Promise<Map<string, string>>
{
	const files = new Map<string, string>();
	for (const sub of ["stories", "frame"])
	{
		const entries = await readdir(join(dir, sub), {
			recursive: true,
		});
		for (const entry of entries.sort())
		{
			const path = join(dir, sub, entry);
			if (path.endsWith(".md"))
			{
				files.set(relative(dir, path).split(sep).join("/"), await readFile(path, "utf8"));
			}
		}
	}
	return files;
}

/** 1-based line of the first difference, for a readable failure. */
function firstDifferentLine(a: string, b: string): number
{
	const left = a.split("\n");
	const right = b.split("\n");
	const index = left.findIndex((line, i) => line !== right[i]);
	return (index === -1 ? left.length : index) + 1;
}

if (values["from-vault"] !== undefined)
{
	if (values.to === undefined)
	{
		throw new Error("--from-vault needs --to <file>");
	}
	await writeFile(values.to, assembleBacklog(await readVaultDir(resolve(values["from-vault"]))));
	log(`assembled ${values.to} from ${values["from-vault"]}`);
}
else if (values.roundtrip)
{
	const source = await readFile(values.backlog, "utf8");
	const assembled = assembleBacklog(renderVault(parseBacklog(source)));
	if (values.to !== undefined)
	{
		await writeFile(values.to, assembled);
	}
	if (assembled !== source)
	{
		console.error(`backlog-vault: round trip differs from ${values.backlog} at line ${firstDifferentLine(assembled, source)}`);
		process.exitCode = 1;
	}
	else
	{
		log(`round trip of ${values.backlog} is byte-identical`);
	}
}
else
{
	const out = resolve(values.out);
	const files = renderVault(parseBacklog(await readFile(values.backlog, "utf8")));

	// Stale notes (a removed story or frame part) must not linger; rm works on read-only files in a writable dir.
	for (const sub of ["stories", "frame"])
	{
		await rm(join(out, sub), {
			recursive: true,
			force: true,
		});
	}
	for (const [path, content] of files)
	{
		const target = join(out, path);
		await mkdir(dirname(target), {
			recursive: true,
		});
		await rm(target, {
			force: true,
		});
		await writeFile(target, content);
		await chmod(target, 0o444);
	}
	log(`wrote ${files.size} files to ${out}`);
}

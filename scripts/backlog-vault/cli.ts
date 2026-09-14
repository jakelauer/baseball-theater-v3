/**
 * `pnpm backlog:vault [--out <dir>] [--quiet]` — regenerate the read-only Obsidian
 * vault from docs/v3/BACKLOG.md (docs/v3/VAULT-MIGRATION.md, V1).
 *
 * Renders everything in memory first, so a backlog that fails to parse leaves the
 * existing vault untouched. Obsidian's own `.obsidian/` settings are never removed.
 */

import {
	chmod, mkdir, readFile, rm, writeFile,
} from "node:fs/promises";
import {
	dirname, join, resolve,
} from "node:path";
import { parseArgs } from "node:util";
import { parseBacklog } from "./parse.ts";
import { renderVault } from "./vault.ts";

const repoRoot = resolve(import.meta.dirname, "../..");

const { values } = parseArgs({
	options: {
		out: {
			type: "string",
			default: join(repoRoot, ".backlog-vault"),
		},
		quiet: {
			type: "boolean",
			default: false,
		},
	},
});

const out = resolve(values.out);
const files = renderVault(parseBacklog(await readFile(join(repoRoot, "docs/v3/BACKLOG.md"), "utf8")));

// Stale notes (a removed story) must not linger; rm works on read-only files in a writable dir.
await rm(join(out, "stories"), {
	recursive: true,
	force: true,
});
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

if (!values.quiet)
{
	console.log(`backlog-vault: wrote ${files.size} files to ${out}`);
}

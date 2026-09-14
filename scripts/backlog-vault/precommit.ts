/**
 * Pre-commit step for the backlog notes (docs/v3/VAULT-MIGRATION.md, V3).
 *
 * Builds from the **index**, not the working tree, so a commit's BACKLOG.md reflects exactly
 * the notes (and AUDIT.md) being committed, and unstaged edits never leak into it. Results go
 * into the index; a working-tree file is only rewritten when it still matches what was staged,
 * so unstaged edits are never clobbered either.
 */

import { execFileSync } from "node:child_process";
import {
	readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { buildFromNotes } from "./assemble.ts";

export const NOTES_DIR = "docs/v3/backlog";
export const BACKLOG = "docs/v3/BACKLOG.md";
export const AUDIT = "docs/v3/AUDIT.md";

export interface PrecommitResult
{
	ok: boolean;
	message?: string;
	/** Repo-relative paths whose staged content the step changed. */
	restaged: string[];
}

function git(repo: string, args: string[], input?: string): string
{
	return execFileSync("git", args, {
		cwd: repo,
		encoding: "utf8",
		input,
		maxBuffer: 64 * 1024 * 1024,
	});
}

/** NUL-separated git output → paths (immune to core.quotepath escaping of "—" and friends). */
function paths(output: string): string[]
{
	return output.split("\0").filter((p) => p !== "");
}

function staged(repo: string, path: string): string | undefined
{
	try
	{
		return git(repo, ["show", `:${path}`]);
	}
	catch
	{
		return undefined;
	}
}

function working(repo: string, path: string): string | undefined
{
	try
	{
		return readFileSync(join(repo, path), "utf8");
	}
	catch
	{
		return undefined;
	}
}

/** Stage `content` at `path` (or remove it when undefined); mirror to disk only if disk still equals the old staged copy. */
function restage(repo: string, path: string, before: string | undefined, content: string | undefined)
{
	const onDisk = working(repo, path);
	if (content === undefined)
	{
		git(repo, ["update-index", "--force-remove", "--", path]);
		if (onDisk !== undefined && onDisk === before)
		{
			rmSync(join(repo, path));
		}
		return;
	}
	const blob = git(repo, ["hash-object", "-w", "--stdin"], content).trim();
	git(repo, ["update-index", "--add", "--cacheinfo", `100644,${blob},${path}`]);
	if (onDisk === before)
	{
		writeFileSync(join(repo, path), content);
	}
}

export function runPrecommit(repo: string): PrecommitResult
{
	const changed = paths(git(repo, ["diff", "--cached", "--name-only", "-z", "--", NOTES_DIR, BACKLOG, AUDIT]));
	if (changed.length === 0)
	{
		return {
			ok: true,
			restaged: [],
		};
	}

	const notes = new Map<string, string>();
	for (const path of paths(git(repo, ["ls-files", "-z", "--cached", "--", `${NOTES_DIR}/stories`, `${NOTES_DIR}/frame`])))
	{
		const key = path.slice(NOTES_DIR.length + 1);
		const content = staged(repo, path);
		if (/^(stories|frame)\/[^/]+\.md$/.test(key) && content !== undefined)
		{
			notes.set(key, content);
		}
	}

	let built;
	try
	{
		built = buildFromNotes(notes, staged(repo, AUDIT));
	}
	catch (error)
	{
		return {
			ok: false,
			message: `the staged backlog notes do not build: ${(error as Error).message}`,
			restaged: [],
		};
	}

	const stagedBacklog = staged(repo, BACKLOG);
	// BACKLOG.md staged with nothing it is built from can only be a hand edit (or a stale build).
	if (changed.length === 1 && changed[0] === BACKLOG && stagedBacklog !== built.backlog)
	{
		return {
			ok: false,
			message: `${BACKLOG} is generated — edit the notes in ${NOTES_DIR}/ and run pnpm backlog:build. `
				+ "(To keep a hand edit of BACKLOG.md instead, run pnpm backlog:import, then stage the notes.)",
			restaged: [],
		};
	}

	const restaged: string[] = [];
	for (const key of new Set([...notes.keys(), ...built.notes.keys()]))
	{
		const before = notes.get(key);
		const after = built.notes.get(key);
		if (before !== after)
		{
			restage(repo, `${NOTES_DIR}/${key}`, before, after);
			restaged.push(`${NOTES_DIR}/${key}`);
		}
	}
	if (stagedBacklog !== built.backlog)
	{
		restage(repo, BACKLOG, stagedBacklog, built.backlog);
		restaged.push(BACKLOG);
	}
	return {
		ok: true,
		restaged,
	};
}

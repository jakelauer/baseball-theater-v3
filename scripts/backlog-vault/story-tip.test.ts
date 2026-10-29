/**
 * S88: one lookup for "the commit a story shipped in". `story_tip` (scripts/lib/checks.sh,
 * read by the graders' `story_*` helpers) and `shipping_commit` (scripts/lib/reverify.sh,
 * read by `audit.sh --reverify`) must give the same answer, from the ledger, however the
 * commits are worded. Runs the real scripts in a throwaway git repository.
 */
import { spawnSync } from "node:child_process";
import {
	copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	afterEach, beforeEach, describe, expect, it,
} from "vitest";

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "<!-- entries below; newest last; appended by scripts/audit.sh -->";

let repo: string;

function git(...args: string[]): string
{
	const run = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "core.hooksPath=/dev/null", ...args], {
		cwd: repo,
		encoding: "utf8",
	});
	if (run.status !== 0) throw new Error(`git ${args.join(" ")}: ${run.stderr}`);
	return run.stdout.trim();
}

function write(path: string, text: string): void
{
	mkdirSync(dirname(join(repo, path)), {
		recursive: true,
	});
	writeFileSync(join(repo, path), text);
}

function commit(message: string): string
{
	git("add", "-A");
	git("commit", "-q", "-m", message);
	return git("rev-parse", "--short", "HEAD");
}

/** `story_tip` and `shipping_commit` for one story, run from the repository root as a grader would. */
function lookups(id: string, ledger = "docs/v3/AUDIT.md"): { tip: string;
	ship: string; }
{
	const run = (fn: string): string => spawnSync("bash", ["-c", `source scripts/lib/checks.sh; source scripts/lib/reverify.sh; ${fn}`], {
		cwd: repo,
		encoding: "utf8",
	}).stdout.trim();
	return {
		tip: run(`story_tip ${id}`),
		ship: run(`shipping_commit ${ledger} ${id}`),
	};
}

beforeEach(() =>
{
	repo = mkdtempSync(join(tmpdir(), "story-tip-"));
	git("init", "-q", "-b", "main");
	mkdirSync(join(repo, "scripts/lib"), {
		recursive: true,
	});
	for (const f of ["lib/checks.sh", "lib/reverify.sh"]) copyFileSync(join(SCRIPTS, f), join(repo, "scripts", f));
	write("docs/v3/AUDIT.md", `# Ledger\n\n${MARKER}\n`);
	commit("base");
});

afterEach(() =>
{
	rmSync(repo, {
		recursive: true,
		force: true,
	});
});

describe("story_tip is shipping_commit (S88)", () =>
{
	it("completion entry: both name the commit that adds the entry, not a later commit worded '<ID>: '", () =>
	{
		write("work.txt", "the story's work\n");
		write("docs/v3/AUDIT.md", `# Ledger\n\n${MARKER}\n\n---\n\n## 2026-01-02 — S900 completed\n\n| | |\n|---|---|\n| Captured (UTC) | \`2026-01-02T03:04:05Z\` |\n`);
		const ship = commit("S900: the story");
		write("fixup.txt", "a later fix\n");
		commit("S900: a later fix, worded like a shipping commit");

		expect(lookups("S900")).toEqual({
			tip: ship,
			ship,
		});
	});

	it("backfill entry: both name its Shipped in commit, even with no commit worded '<ID>: '", () =>
	{
		write("work.txt", "old work\n");
		const shipped = commit("old work, worded anyhow");
		write("docs/v3/AUDIT.md", `# Ledger\n\n${MARKER}\n\n---\n\n## 2026-01-02 — S901 verified (backfill)\n\n| | |\n|---|---|\n| Shipped in | \`${shipped}\` — old work. |\n| Captured (UTC) | \`2026-01-02T03:04:05Z\` |\n`);
		commit("backfill the ledger");

		expect(lookups("S901")).toEqual({
			tip: shipped,
			ship: shipped,
		});
	});

	it("no entry: both are empty, so the story_* helpers compare against the working tree", () =>
	{
		write("checkpoint.txt", "parked work\n");
		commit("S902: a checkpoint worded like a shipping commit");

		expect(lookups("S902")).toEqual({
			tip: "",
			ship: "",
		});
		const changed = spawnSync("bash", ["-c", "source scripts/lib/checks.sh; echo new > untracked.txt; story_changed_files S902 HEAD~1 ."], {
			cwd: repo,
			encoding: "utf8",
		}).stdout.trim().split("\n");
		expect(changed).toEqual(expect.arrayContaining(["checkpoint.txt", "untracked.txt"]));
	});

	it("V* stories read the vault migration ledger", () =>
	{
		write("work.txt", "vault work\n");
		write("docs/v3/VAULT-MIGRATION-AUDIT.md", "# Ledger\n\n---\n\n## 2026-01-02 — V9 completed\n\n| | |\n|---|---|\n| Captured (UTC) | `2026-01-02T03:04:05Z` |\n");
		const ship = commit("V9 done");

		expect(lookups("V9", "docs/v3/VAULT-MIGRATION-AUDIT.md")).toEqual({
			tip: ship,
			ship,
		});
	});
});

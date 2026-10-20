// @ts-check
/**
 * `pnpm comments:stale [--base <ref>]` — ADR-025's comment check: list every
 * exported function, type, class or const whose code changed against `<ref>`
 * (default `HEAD`, i.e. the uncommitted change) while its leading comment did
 * not. Each hit is a comment to re-read before finishing: it may now be untrue.
 *
 * Heuristic by design — a body can change without invalidating its comment —
 * so it **flags, never fails**: it always exits 0 once git answers. Scope is
 * the product code `jscpd` also watches (`packages/`, `functions/src/`,
 * `web/src/`), tests and generated files excluded. A symbol that is new, or
 * whose comment changed, is not reported.
 */
import { execFileSync } from "node:child_process";
import console from "node:console";
import { readFileSync } from "node:fs";
import process from "node:process";
import ts from "typescript";

const ROOTS = ["packages", "functions/src", "web/src"];

/**
 * Exported top-level declarations of one source file, by name, with the
 * comment immediately above each and the declaration's own text.
 * @param {string} source
 * @param {string} fileName
 * @returns {Map<string, { comment: string; body: string }>}
 */
export function exportedSymbols(source, fileName)
{
	const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	/** @type {Map<string, { comment: string; body: string }>} */
	const symbols = new Map();
	for (const statement of file.statements)
	{
		const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
		if (!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
		const comment = (ts.getLeadingCommentRanges(source, statement.getFullStart()) ?? [])
			.map((r) => source.slice(r.pos, r.end))
			.join("\n");
		const body = statement.getText(file);
		const names = ts.isVariableStatement(statement)
			? statement.declarationList.declarations.map((d) => d.name.getText(file))
			: [/** @type {{ name?: ts.Node }} */ (statement).name?.getText(file) ?? "default"];
		for (const name of names) symbols.set(name, { comment, body });
	}
	return symbols;
}

/**
 * Names of exported symbols present in both versions whose declaration text
 * changed while the comment above it stayed byte-for-byte the same.
 * @param {string} before
 * @param {string} after
 * @param {string} fileName
 * @returns {string[]}
 */
export function staleComments(before, after, fileName)
{
	const old = exportedSymbols(before, fileName);
	const stale = [];
	for (const [name, now] of exportedSymbols(after, fileName))
	{
		const was = old.get(name);
		if (was && was.body !== now.body && was.comment === now.comment) stale.push(name);
	}
	return stale;
}

/** @param {string[]} args */
function git(args)
{
	return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** CLI: compare the working tree against `--base` (default HEAD) and print each flag. */
function main()
{
	const i = process.argv.indexOf("--base");
	const base = i >= 0 ? process.argv[i + 1] ?? "HEAD" : "HEAD";
	const files = git(["diff", "--name-only", "--diff-filter=M", base, "--", ...ROOTS])
		.split("\n")
		.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes("/generated/"));
	let count = 0;
	for (const f of files)
	{
		const before = git(["show", `${base}:${f}`]);
		const after = readFileSync(f, "utf8");
		for (const name of staleComments(before, after, f))
		{
			console.log(`${f}: ${name} — code changed, comment did not; re-read it`);
			count++;
		}
	}
	console.log(count === 0 ? `comments:stale: nothing to re-read against ${base}` : `comments:stale: ${count} comment(s) to re-read against ${base} (flag, not a failure)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

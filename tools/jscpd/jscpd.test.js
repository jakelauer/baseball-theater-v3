import { execFileSync } from "node:child_process";
import {
	mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterAll, describe, expect, it,
} from "vitest";

const repo = join(import.meta.dirname, "..", "..");
const config = JSON.parse(readFileSync(join(repo, ".jscpd.json"), "utf8"));
const dir = mkdtempSync(join(tmpdir(), "bt-jscpd-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Run jscpd with the repo's committed settings over `dir`; returns the exit code. */
function jscpd()
{
	const cfg = join(dir, "jscpd.json");
	writeFileSync(cfg, JSON.stringify({ ...config, path: [join(dir, "src")], gitignore: false, silent: true }));
	try
	{
		execFileSync("pnpm", ["exec", "jscpd", "--config", cfg], { cwd: repo, stdio: "pipe" });
		return 0;
	}
	catch (e)
	{
		return /** @type {{ status: number }} */ (e).status;
	}
}

// A 30-line block of ordinary code, distinct per seed.
const block = (seed) => Array.from({ length: 30 }, (_, i) => `export const value${seed}_${i} = compute(${seed * 100 + i}, "${seed}-${i}") + offset${i % 3};`).join("\n");

describe("jscpd duplication gate (.jscpd.json)", () =>
{
	it("passes a tree with no copied code", () =>
	{
		execFileSync("mkdir", ["-p", join(dir, "src")]);
		writeFileSync(join(dir, "src", "a.ts"), block(1));
		writeFileSync(join(dir, "src", "b.ts"), block(2));
		expect(jscpd()).toBe(0);
	});

	it("fails when a 30-line block is copied into a second file", () =>
	{
		writeFileSync(join(dir, "src", "b.ts"), `${block(2)}\n${block(1)}`);
		expect(jscpd()).not.toBe(0);
	});
});

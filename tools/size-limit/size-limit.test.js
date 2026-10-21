import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
	mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterAll, describe, expect, it,
} from "vitest";

// `pnpm verify` runs its tests before `pnpm build`, so on a clean checkout there
// is no `web/dist` to measure. Instead this builds a stand-in tree whose entry
// chunk matches the committed `.size-limit.json` glob, and runs size-limit there
// with the repo's own config and plugins — only the budget is changed. It runs
// the exact command `pnpm size` runs, whose `--json` output names each asset.
const repo = join(import.meta.dirname, "..", "..");
const config = JSON.parse(readFileSync(join(repo, ".size-limit.json"), "utf8"));
const [bin, ...args] = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).scripts.size.split(" ");
const dir = mkdtempSync(join(tmpdir(), "bt-size-limit-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const assets = join(dir, "web", "dist", "assets");
mkdirSync(assets, { recursive: true });
// Random bytes don't compress, so ~6 KB stays ~6 KB gzipped.
writeFileSync(join(assets, "index-stand1n.js"), `export const blob = "${randomBytes(4096).toString("base64")}";\n`);
symlinkSync(join(repo, "node_modules"), join(dir, "node_modules"), "dir");
writeFileSync(join(dir, "package.json"), readFileSync(join(repo, "package.json")));

/** Run size-limit in the stand-in tree with every entry's limit set to `limit`. */
function sizeLimit(limit)
{
	writeFileSync(join(dir, ".size-limit.json"), JSON.stringify(config.map((entry) => ({ ...entry, limit }))));
	try
	{
		const stdout = execFileSync(join(repo, "node_modules", ".bin", bin), args, { cwd: dir, encoding: "utf8", stdio: "pipe" });
		return { status: 0, output: stdout };
	}
	catch (e)
	{
		const err = /** @type {{ status: number; stdout: string; stderr: string }} */ (e);
		return { status: err.status, output: `${err.stdout}${err.stderr}` };
	}
}

describe("size-limit budget (.size-limit.json)", () =>
{
	it("passes the entry chunk under the committed 200 KB budget", () =>
	{
		expect(config.map((entry) => entry.limit)).toEqual(["200 KB"]);
		expect(sizeLimit("200 KB").status).toBe(0);
	});

	it("exits nonzero and names the asset when the budget is lowered to 1 KB", () =>
	{
		const { status, output } = sizeLimit("1 KB");
		expect(status).not.toBe(0);
		const [result] = JSON.parse(output);
		expect(result).toMatchObject({ name: config[0].name, passed: false });
		expect(result.name).toContain("web/dist/assets/index-");
	});
});

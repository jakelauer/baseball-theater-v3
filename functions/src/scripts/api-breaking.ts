/**
 * `pnpm api:breaking` — fail on any backward-incompatible change to the v1 API (S27, ADR-015).
 *
 * Diffs a freshly generated spec (the revision) against the committed baseline
 * `openapi/bt-api.v1.baseline.json` with `oasdiff breaking --fail-on ERR`. The
 * baseline is a separate, deliberately advanced file — never the generated spec —
 * so this is never a self-diff. `--revision <file>` diffs that file instead of a
 * fresh generation (how the gate is tested against a broken fixture). Offline.
 */
import { spawnSync } from "node:child_process";
import {
	mkdtemp, rm, writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { generateOpenApiSpec } from "../services/openapi.js";

const BASELINE = fileURLToPath(new URL("../../../openapi/bt-api.v1.baseline.json", import.meta.url));

const { values } = parseArgs({
	options: {
		revision: {
			type: "string",
		},
	},
});

const scratch = await mkdtemp(path.join(tmpdir(), "bt-api-breaking-"));
try
{
	let revision = values.revision === undefined ? undefined : path.resolve(values.revision);
	if (revision === undefined)
	{
		revision = path.join(scratch, "bt-api.v1.generated.json");
		await writeFile(revision, await generateOpenApiSpec());
	}
	if (path.resolve(revision) === path.resolve(BASELINE))
	{
		console.error("api:breaking: the revision is the baseline itself — a self-diff proves nothing.");
		process.exitCode = 2;
	}
	else
	{
		console.log(`base: ${BASELINE}`);
		console.log(`revision: ${revision}`);
		const result = spawnSync("oasdiff", ["breaking", BASELINE, revision, "--fail-on", "ERR"], {
			stdio: "inherit",
		});
		if (result.error)
		{
			console.error(`api:breaking: could not run oasdiff: ${result.error.message}`);
		}
		process.exitCode = result.status ?? 1;
	}
}
finally
{
	await rm(scratch, {
		recursive: true,
		force: true,
	});
}

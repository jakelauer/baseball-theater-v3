/**
 * `pnpm api:spec` — regenerate `openapi/bt-api.v1.json` from the route table (S27).
 *
 * `--out <file>` writes somewhere else (graders use a temp file). `--check`
 * writes nothing and exits 1 if the committed spec is stale.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { COMMITTED_SPEC, generateOpenApiSpec } from "../services/openapi.js";

const { values } = parseArgs({
	options: {
		out: {
			type: "string",
		},
		check: {
			type: "boolean",
			default: false,
		},
	},
});

const spec = await generateOpenApiSpec();

if (values.check)
{
	const committed = await readFile(COMMITTED_SPEC, "utf8").catch(() => "");
	if (committed !== spec)
	{
		console.error(`api:spec: ${path.relative(process.cwd(), COMMITTED_SPEC)} is stale — run pnpm api:spec and commit the result.`);
		process.exit(1);
	}
	console.log("api:spec: committed spec is up to date");
}
else
{
	const out = values.out === undefined ? COMMITTED_SPEC : path.resolve(values.out);
	await writeFile(out, spec);
	console.log(`api:spec: wrote ${out}`);
}

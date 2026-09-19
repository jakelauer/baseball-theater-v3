import {
	mkdtemp, readFile, rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	describe, expect, it,
} from "vitest";
import {
	GENERATED_DIR, GENERATED_FILE, renderApiTypes, writeApiTypes,
} from "./codegen.js";

// ADR-016's freshness rule, enforced in CI: the committed src/api/generated/ output
// must be exactly what the generator renders from the committed spec today.
describe("src/api/generated/ drift gate", () =>
{
	it("matches a fresh render of openapi/bt-api.v1.json", async () =>
	{
		const committed = await readFile(join(GENERATED_DIR, GENERATED_FILE), "utf8");
		expect(committed).toBe(await renderApiTypes());
	});

	it("writes the render, banner first, into the directory it is given", async () =>
	{
		const dir = await mkdtemp(join(tmpdir(), "bt-api-types-"));
		try
		{
			const file = await writeApiTypes(join(dir, "nested"));
			const written = await readFile(file, "utf8");
			expect(written.split("\n").slice(0, 5).join("\n")).toContain("@generated");
			expect(written).toBe(await renderApiTypes());
		}
		finally
		{
			await rm(dir, {
				recursive: true,
				force: true,
			});
		}
	});
});

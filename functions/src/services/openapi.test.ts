import { execFileSync } from "node:child_process";
import {
	mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApiRoutes } from "@bt/domain";
import {
	afterAll, describe, expect, it,
} from "vitest";
import {
	buildOpenApiSpec, COMMITTED_SPEC, generateOpenApiSpec, ROUTE_DESCRIPTIONS, toOpenApiPath,
} from "./openapi.js";

// Test-only traversal of a parsed JSON document, whose shape the assertions themselves check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

interface GateResult
{
	status: number;
	output: string;
}

/** What `execFileSync` throws when the command exits nonzero. */
interface ExecFailure
{
	status: number;
	stdout: string;
}

const generated = await generateOpenApiSpec();
const spec = JSON.parse(generated) as Json;
const baseline = fileURLToPath(new URL("../../../openapi/bt-api.v1.baseline.json", import.meta.url));

describe("toOpenApiPath", () =>
{
	it("turns :params into {params}", () =>
	{
		expect(toOpenApiPath("/api/v1/games/:gamePk")).toBe("/api/v1/games/{gamePk}");
		expect(toOpenApiPath("/api/v1/schedule")).toBe("/api/v1/schedule");
	});
});

describe("generateOpenApiSpec", () =>
{
	it("is the committed spec (regenerate with pnpm api:spec)", () =>
	{
		expect(generated).toBe(readFileSync(COMMITTED_SPEC, "utf8"));
	});

	it("has one operation per route, each with a described error response", () =>
	{
		const routes = Object.keys(ApiRoutes);
		const operations = Object.values(spec.paths as Json).flatMap((item) => Object.keys(item));
		expect(operations).toHaveLength(routes.length);
		expect(Object.keys(ROUTE_DESCRIPTIONS).sort()).toEqual([...routes].sort());
	});

	it("refs each route's response alias, which resolves to the generated domain schema", () =>
	{
		const schemas = spec.components.schemas as Json;
		const game = spec.paths["/api/v1/games/{gamePk}"].get;
		expect(game.responses["200"].content["application/json"].schema.$ref).toBe("#/components/schemas/GameSnapshotResponse");
		expect(schemas.GameSnapshotResponse).toEqual({
			$ref: "#/components/schemas/GameSnapshot",
		});
		expect(schemas.GameSnapshot.properties).toHaveProperty("fetchedAt");
		expect(schemas.GameSnapshot.properties).toHaveProperty("windowMode");
		expect(spec.paths["/api/v1/schedule"].get.responses["200"].content["application/json"].schema.$ref).toBe("#/components/schemas/ScheduleDayResponse");
	});

	it("declares the handler's error responses with ApiErrorResponse bodies", () =>
	{
		const errorRef = {
			$ref: "#/components/schemas/ApiErrorResponse",
		};
		expect(spec.paths["/api/v1/schedule"].get.responses["400"].content["application/json"].schema).toEqual(errorRef);
		expect(spec.paths["/api/v1/games/{gamePk}"].get.responses["404"].content["application/json"].schema).toEqual(errorRef);
		expect(spec.components.schemas.ApiErrorResponse).toMatchObject({
			properties: {
				error: {
					type: "string",
				},
				hint: {
					type: "string",
				},
			},
			required: ["error"],
		});
	});

	it("is stable: building twice from the same schemas gives identical output", () =>
	{
		const schemas = spec.components.schemas as Json;
		expect(JSON.stringify(buildOpenApiSpec(schemas))).toBe(JSON.stringify(buildOpenApiSpec({
			...schemas,
		})));
	});
});

describe("oasdiff breaking gate", () =>
{
	const dir = mkdtempSync(path.join(tmpdir(), "bt-openapi-test-"));
	afterAll(() => rmSync(dir, {
		recursive: true,
		force: true,
	}));

	function breaking(revision: Json): GateResult
	{
		const file = path.join(dir, `rev-${Math.random().toString(36).slice(2)}.json`);
		writeFileSync(file, JSON.stringify(revision));
		try
		{
			const output = execFileSync("oasdiff", ["breaking", baseline, file, "--fail-on", "ERR"], {
				encoding: "utf8",
				stdio: "pipe",
			});
			return {
				status: 0,
				output,
			};
		}
		catch (error)
		{
			const e = error as ExecFailure;
			return {
				status: e.status,
				output: e.stdout,
			};
		}
	}

	it("passes the unmodified spec", () =>
	{
		expect(breaking(spec).status).toBe(0);
	});

	it("passes an additive change (a new optional response field)", () =>
	{
		const added = structuredClone(spec);
		added.components.schemas.GameSnapshot.properties.newOptionalField = {
			type: "string",
		};
		expect(breaking(added).status).toBe(0);
	});

	it("fails a removed response field, naming the change", () =>
	{
		const removed = structuredClone(spec);
		const game = removed.components.schemas.GameSnapshot;
		delete game.properties.fetchedAt;
		game.required = game.required.filter((name: string) => name !== "fetchedAt");
		const result = breaking(removed);
		expect(result.status).not.toBe(0);
		expect(result.output).toContain("removed the required property `fetchedAt` from the response");
	});
}, 30_000);

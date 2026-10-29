/**
 * S2: the 823823 fixtures (CHC @ MIA, 2026-09-05, Final 6–5) are derived, not typed.
 * `recordNormalized` — the recorder's own normalized path — runs against an injected
 * `fetch` that answers each upstream URL with its committed recording in
 * `fixtures/raw/`, so the box score and per-inning linescore come through the same
 * mappers as live data, with no network. Then the API serves them.
 */
import {
	mkdtempSync, readFileSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	afterEach, describe, expect, it,
} from "vitest";
import { createDevAccountData, createDevAuth } from "../adapters/fixtures/auth.js";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import { HttpMlbStatsClient } from "../adapters/http/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
	InMemorySettingsRepository,
} from "../adapters/memory/repos.js";
import { handleApiRequest } from "../handlers/api.js";
import { rawEndpoints, recordNormalized } from "./recorder.js";
import type { RecorderTarget } from "./recorder.js";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
const TARGET: RecorderTarget = {
	date: "2026-09-05",
	gamePk: 823823,
};

/** A `fetch` that serves `fixtures/raw/<name>.json` for each URL the recorder asks for. */
function rawFetch(): typeof fetch
{
	const byUrl = new Map(rawEndpoints(TARGET).map((e) => [e.url, path.join(FIXTURES, "raw", `${e.name}.json`)]));
	return async (input) =>
	{
		const file = byUrl.get(String(input));
		if (!file) throw new Error(`no recording for ${String(input)}`);
		return new Response(readFileSync(file), {
			headers: {
				"Content-Type": "application/json",
			},
		});
	};
}

let out: string | undefined;

afterEach(() =>
{
	if (out) rmSync(out, {
		recursive: true,
		force: true,
	});
	out = undefined;
});

describe("823823 fixtures (S2)", () =>
{
	it("regenerates game-823823.json and plays-823823.json offline from fixtures/raw/, equal to the committed files", async () =>
	{
		out = mkdtempSync(path.join(tmpdir(), "fixture-823823-"));
		const client = new HttpMlbStatsClient({
			fetchImpl: rawFetch(),
			now: () => new Date("2026-09-05T23:00:00.000Z"),
		});
		await recordNormalized(client, TARGET, out);

		for (const file of ["game-823823.json", "plays-823823.json"])
		{
			expect(readFileSync(path.join(out, file), "utf8"), file).toBe(readFileSync(path.join(FIXTURES, file), "utf8"));
		}
	});

	it("GET /api/v1/games/823823 serves the box score and every inning", async () =>
	{
		const auth = createDevAuth();
		const settings = new InMemorySettingsRepository();
		const res = await handleApiRequest(new Request("http://localhost:8787/api/v1/games/823823"), {
			ingest: {
				mlb: new FixtureMlbStatsClient(),
				schedules: new InMemoryScheduleRepository(),
				games: new InMemoryGameRepository(),
				projections: new InMemoryGameProjectionRepository(),
			},
			auth,
			settings,
			account: createDevAccountData({
				users: auth.users,
				settings,
			}),
		});
		expect(res.status).toBe(200);
		const game = await res.json() as {
			boxscore: { teams: { away: { batting: unknown[] };
				home: { batting: unknown[] }; };
			info: { label: string;
				value: string; }[]; };
			linescore: { innings: unknown[] };
		};
		expect(game.boxscore.teams.away.batting.length).toBeGreaterThan(0);
		expect(game.boxscore.teams.home.batting.length).toBeGreaterThan(0);
		expect(game.boxscore.info).toContainEqual({
			label: "Venue",
			value: "loanDepot park.",
		});
		expect(game.linescore.innings).toHaveLength(9);
	});
});

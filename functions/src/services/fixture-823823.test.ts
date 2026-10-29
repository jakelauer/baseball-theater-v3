/**
 * S2: the 823823 fixtures (CHC @ MIA, 2026-09-05, Final 6–5) are derived, not typed.
 * `recordNormalized` — the recorder's own normalized path — runs against an injected
 * `fetch` that answers each upstream URL with its committed recording in
 * `fixtures/raw/`, so the box score and per-inning linescore come through the same
 * mappers as live data, with no network — and the editorial recap with them (S10).
 * Then the API serves them.
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
import { HttpMlbStatsClient } from "../adapters/http/mlb.js";
import { fixtureGet } from "../handlers/fixture-request.js";
import { recordedFetch } from "./live-fixture.js";
import { recordNormalized } from "./recorder.js";
import type { RecorderTarget } from "./recorder.js";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
const TARGET: RecorderTarget = {
	date: "2026-09-05",
	gamePk: 823823,
};

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
			fetchImpl: recordedFetch(path.join(FIXTURES, "raw"), TARGET),
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
		const res = await fixtureGet("/api/v1/games/823823");
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

	it("recap: GET /api/v1/games/823823 serves the recap derived from the recording (S10)", async () =>
	{
		const committed = JSON.parse(readFileSync(path.join(FIXTURES, "game-823823.json"), "utf8")) as { recap: unknown };
		const game = await (await fixtureGet("/api/v1/games/823823")).json() as { recap: { headline: string;
			text: string; }; };
		expect(game.recap).toEqual(committed.recap);
		expect(game.recap.headline).toMatch(/^Zeferjahn records 1st Cubs save/);
		expect(game.recap.text.length).toBeGreaterThan(20);
	});
});

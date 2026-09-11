import {
	describe, expect, it,
} from "vitest";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
} from "../adapters/memory/repos.js";
import { getOrRefreshGame } from "./ingest.js";

/**
 * The committed fixture for 744834 (NYM @ WSH) carries plays, so the projected
 * boxscore tables are derived from real at-bats rather than an empty stub.
 */
function deps()
{
	return {
		mlb: new FixtureMlbStatsClient(),
		schedules: new InMemoryScheduleRepository(),
		games: new InMemoryGameRepository(),
		projections: new InMemoryGameProjectionRepository(),
	};
}

describe("ingest projects a game into BT store documents", () =>
{
	it("writes all five documents through the projection repository", async () =>
	{
		const d = deps();
		await getOrRefreshGame(d, 744834);

		const projection = await d.projections.getByPk(744834);
		expect(projection).not.toBeNull();
		expect(Object.keys(projection ?? {}).sort()).toEqual([
			"boxscore",
			"header",
			"linescore",
			"media",
			"plays",
		]);
	});

	it("binds the paths the UI reads: teams, count of plays, boxscore rows", async () =>
	{
		const d = deps();
		const snapshot = await getOrRefreshGame(d, 744834);
		const projection = await d.projections.getByPk(744834);
		if (!projection || !snapshot) throw new Error("expected a projected game");

		expect(projection.header.teams.away.abbreviation).toBe("NYM");
		expect(projection.header.teams.home.abbreviation).toBe("WSH");
		expect(projection.header.gamePk).toBe(744834);
		expect(projection.header.fetchedAt).toBe(snapshot.fetchedAt);

		expect(projection.plays.playCount).toBe(snapshot.plays.length);
		expect(projection.plays.playCount).toBeGreaterThan(0);

		const { away, home } = projection.boxscore.teams;
		expect(away.abbreviation).toBe("NYM");
		expect(home.abbreviation).toBe("WSH");
		for (const table of [away, home])
		{
			expect(table.batting.length).toBeGreaterThanOrEqual(1);
			expect(table.pitching.length).toBeGreaterThanOrEqual(1);
			expect(table.batting[0]?.name).toBeTruthy();
			expect(table.pitching[0]?.battersFaced).toBeGreaterThan(0);
		}

		expect(projection.linescore.linescore).toEqual(snapshot.linescore);
		expect(projection.media.highlights).toEqual(snapshot.highlights);
	});
});

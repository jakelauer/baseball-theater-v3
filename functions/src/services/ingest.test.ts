import {
	describe, expect, it,
} from "vitest";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
} from "../adapters/memory/repos.js";
import { getOrRefreshGame, ingestScheduleDay } from "./ingest.js";

describe("ingest with fixtures", () =>
{
	it("loads schedule and games into memory", async () =>
	{
		const schedules = new InMemoryScheduleRepository();
		const games = new InMemoryGameRepository();
		const projections = new InMemoryGameProjectionRepository();
		const mlb = new FixtureMlbStatsClient();
		const day = await ingestScheduleDay(
			{
				mlb,
				schedules,
				games,
				projections,
			},
			"2024-07-04",
		);
		expect(day.games.length).toBe(2);
		expect(await schedules.getByDate("2024-07-04")).not.toBeNull();
		const game = await getOrRefreshGame({
			mlb,
			schedules,
			games,
			projections,
		}, 744834);
		expect(game?.teams.home.abbreviation).toBe("WSH");
		expect(game?.highlights[0]?.title.toLowerCase()).toContain("walk-off");
	});
});

describe("ingest versioning (ADR-022)", () =>
{
	/** A fixture client whose game 744834 can be edited between polls. */
	class EditableClient extends FixtureMlbStatsClient
	{
		detailedState: string | null = null;

		override async fetchGame(gamePk: number)
		{
			const game = await super.fetchGame(gamePk);
			return this.detailedState === null ? game : {
				...game,
				status: {
					...game.status,
					detailedState: this.detailedState,
				},
			};
		}
	}

	it("keeps the version when the same fixture is ingested twice, and bumps it on a changed payload", async () =>
	{
		const mlb = new EditableClient();
		const games = new InMemoryGameRepository();
		const projections = new InMemoryGameProjectionRepository();
		let clock = new Date("2024-07-05T12:00:00.000Z");
		const deps = {
			mlb,
			schedules: new InMemoryScheduleRepository(),
			games,
			projections,
			now: () => clock,
		};

		const first = await getOrRefreshGame(deps, 744834, {
			force: true,
		});
		expect(first?.version).toBe(1);
		expect(first?.lastChangedAt).toBe("2024-07-05T12:00:00.000Z");

		clock = new Date("2024-07-05T12:10:00.000Z");
		const same = await getOrRefreshGame(deps, 744834, {
			force: true,
		});
		expect(same?.version).toBe(1);
		expect(same?.lastChangedAt).toBe("2024-07-05T12:00:00.000Z");
		expect((await games.getByPk(744834))?.version).toBe(1);

		mlb.detailedState = "Final: revised";
		clock = new Date("2024-07-05T12:20:00.000Z");
		const changed = await getOrRefreshGame(deps, 744834, {
			force: true,
		});
		expect(changed?.version).toBe(2);
		expect(changed?.lastChangedAt).toBe("2024-07-05T12:20:00.000Z");
		expect((await games.getByPk(744834))?.status.detailedState).toBe("Final: revised");
		expect((await projections.getByPk(744834))?.header.version).toBe(2);
	});

	it("keeps a schedule day's version across identical re-ingests", async () =>
	{
		const schedules = new InMemoryScheduleRepository();
		const deps = {
			mlb: new FixtureMlbStatsClient(),
			schedules,
			games: new InMemoryGameRepository(),
			projections: new InMemoryGameProjectionRepository(),
			now: () => new Date("2024-07-05T12:00:00.000Z"),
		};
		await ingestScheduleDay(deps, "2024-07-04");
		const again = await ingestScheduleDay({
			...deps,
			now: () => new Date("2024-07-05T12:30:00.000Z"),
		}, "2024-07-04");
		expect(again.version).toBe(1);
		expect((await schedules.getByDate("2024-07-04"))?.version).toBe(1);
	});
});

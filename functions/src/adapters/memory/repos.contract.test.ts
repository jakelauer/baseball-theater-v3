/**
 * Every in-memory repository against the shared storage contract (S46), seeded
 * from the committed fixtures (`2024-07-04`, game 744834) so real stored shapes
 * are exercised, not toy objects.
 */
import type {
	GameProjection, GameSnapshot, ScheduleDay,
} from "@bt/domain";
import { projectGame } from "@bt/domain";
import type { ReplayArtifact } from "@bt/ports";
import { FixtureMlbStatsClient } from "../fixtures/mlb.js";
import { describeIdentityLinkContract, describeRepositoryContract } from "../repository-contract.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryReplayArtifactRepository,
	InMemoryScheduleRepository,
	InMemoryUserRepository,
} from "./repos.js";

const fixtures = new FixtureMlbStatsClient();

/** The fixture game re-keyed and versioned; its detailed state names the version so content differs. */
async function game(gamePk: number, version: number, date = "2024-07-04"): Promise<GameSnapshot>
{
	const fetched = await fixtures.fetchGame(744834);
	return {
		...fetched,
		gamePk,
		officialDate: date,
		status: {
			...fetched.status,
			detailedState: `Final (v${version})`,
		},
		version,
		lastChangedAt: `2024-07-05T00:00:0${version}.000Z`,
	};
}

describeRepositoryContract<string, ScheduleDay>("InMemoryScheduleRepository", {
	create: () =>
	{
		const repo = new InMemoryScheduleRepository();
		return {
			upsert: (day) => repo.upsert(day),
			get: (date) => repo.getByDate(date),
		};
	},
	make: async (date, version) => ({
		...(await fixtures.fetchSchedule(date)),
		fetchedAt: `2024-07-05T00:00:0${version}.000Z`,
		games: (await fixtures.fetchSchedule(date)).games.slice(0, version),
		version,
		lastChangedAt: `2024-07-05T00:00:0${version}.000Z`,
	}),
	keyOf: (day) => day.date,
	keys: ["2024-07-04", "2024-07-05"],
	missingKey: "1999-01-01",
	mutate: (day) =>
	{
		day.games.length = 0;
		day.windowMode = "active";
	},
});

describeRepositoryContract<number, GameSnapshot>("InMemoryGameRepository", {
	create: () =>
	{
		const repo = new InMemoryGameRepository();
		return {
			upsert: (g) => repo.upsert(g),
			get: (pk) => repo.getByPk(pk),
			listByDate: (date) => repo.listByDate(date),
		};
	},
	make: (pk, version, date) => game(pk, version, date),
	keyOf: (g) => g.gamePk,
	keys: [744834, 745001],
	missingKey: 1,
	mutate: (g) =>
	{
		g.plays.length = 0;
		g.teams.home.abbreviation = "XXX";
	},
});

describeRepositoryContract<number, GameProjection>("InMemoryGameProjectionRepository", {
	create: () =>
	{
		const repo = new InMemoryGameProjectionRepository();
		return {
			upsert: (p) => repo.upsert(p),
			get: (pk) => repo.getByPk(pk),
		};
	},
	make: async (pk, version) => projectGame(await game(pk, version)),
	keyOf: (p) => p.header.gamePk,
	keys: [744834, 745001],
	missingKey: 1,
	mutate: (p) =>
	{
		p.plays.plays.length = 0;
		p.header.teams.home.abbreviation = "XXX";
	},
});

describeRepositoryContract<number, ReplayArtifact>("InMemoryReplayArtifactRepository", {
	create: () =>
	{
		const repo = new InMemoryReplayArtifactRepository();
		return {
			upsert: (a) => repo.upsert(a),
			get: (pk) => repo.getByPk(pk),
		};
	},
	// A replay's version is its retained patch count, so each version has that many patches.
	make: async (pk, version) =>
	{
		const patches = Array.from({
			length: version,
		}, (_, i) => ({
			startTimecode: `20240704_2300${i}0`,
			endTimecode: `20240704_2300${i + 1}0`,
			diff: [{
				op: "replace" as const,
				path: "/liveData/plays/currentPlay/count/balls",
				value: i,
			}],
		}));
		return {
			gamePk: pk,
			baseTimecode: "20240704_230000",
			timecodes: patches.map((p) => p.endTimecode),
			patches,
			version,
		};
	},
	keyOf: (a) => a.gamePk,
	keys: [744834, 745001],
	missingKey: 1,
	mutate: (a) =>
	{
		a.patches.length = 0;
		a.baseTimecode = "mutated";
	},
});

describeIdentityLinkContract("InMemoryUserRepository", () => new InMemoryUserRepository());

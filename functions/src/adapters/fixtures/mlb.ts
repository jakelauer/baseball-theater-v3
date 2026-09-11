import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
	GameSnapshot,
	MediaHighlight,
	PlayerProfile,
	ScheduleDay,
	StandingsSnapshot,
	AtBat,
} from "@bt/domain";
import { rankHighlightsByImpact } from "@bt/domain";
import type { GameDiffPatchResponse, ReplayPatchEntry } from "@bt/mlb-api";
import { parseGameTimestamps, parseRecordedReplayWalk } from "@bt/mlb-api";
import type { MlbStatsClient } from "@bt/ports";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(HERE, "../../../../fixtures");

type ScheduleFixture = {
	date: string;
	games: ScheduleDay["games"];
};

type GameFixture = Omit<GameSnapshot, "fetchedAt" | "windowMode" | "plays"> & {
	plays?: AtBat[];
};

async function readJson<T>(filePath: string): Promise<T>
{
	const raw = await readFile(filePath, "utf8");
	return JSON.parse(raw) as T;
}

export class FixtureMlbStatsClient implements MlbStatsClient
{
	/** The recorded diffPatch walk is 5+ MB; the capture command asks for every
   * adjacent pair, so parse it once per gamePk and index the pairs. */
	private readonly diffPatchWalks = new Map<number, Map<string, ReplayPatchEntry>>();

	constructor(private readonly fixturesRoot = FIXTURES_ROOT) {}

	async fetchSchedule(date: string): Promise<ScheduleDay>
	{
		const file = path.join(this.fixturesRoot, `schedule-${date}.json`);
		try
		{
			const data = await readJson<ScheduleFixture>(file);
			const now = new Date().toISOString();
			return {
				date: data.date,
				games: data.games,
				fetchedAt: now,
				windowMode: "cache",
			};
		}
		catch
		{
			return {
				date,
				games: [],
				fetchedAt: new Date().toISOString(),
				windowMode: "cache",
			};
		}
	}

	async fetchGame(gamePk: number): Promise<GameSnapshot>
	{
		const file = path.join(this.fixturesRoot, `game-${gamePk}.json`);
		const data = await readJson<GameFixture>(file);
		const plays = await this.loadPlays(gamePk);
		const now = new Date().toISOString();
		return {
			...data,
			plays,
			highlights: rankHighlightsByImpact(data.highlights ?? []),
			fetchedAt: now,
			windowMode: "cache",
		};
	}

	/** Highlights are already ranked onto the committed game fixture. */
	async fetchGameContent(gamePk: number): Promise<MediaHighlight[]>
	{
		const file = path.join(this.fixturesRoot, `game-${gamePk}.json`);
		try
		{
			const data = await readJson<GameFixture>(file);
			return rankHighlightsByImpact(data.highlights ?? []);
		}
		catch
		{
			return [];
		}
	}

	/**
   * Missing-date behaviour matches `fetchSchedule`: an empty table rather than
   * a throw, so a local day with no committed fixture still renders.
   */
	async fetchStandings(date: string): Promise<StandingsSnapshot>
	{
		const file = path.join(this.fixturesRoot, `standings-${date}.json`);
		try
		{
			const data = await readJson<StandingsSnapshot>(file);
			return {
				...data,
				fetchedAt: new Date().toISOString(),
				windowMode: "cache",
			};
		}
		catch
		{
			return {
				date,
				divisions: [],
				fetchedAt: new Date().toISOString(),
				windowMode: "cache",
			};
		}
	}

	/**
   * The committed player fixtures are keyed by the game they were recorded
   * from, so this scans them and returns the requested ids in the order asked.
   */
	async fetchPlayers(ids: number[]): Promise<PlayerProfile[]>
	{
		const players = await this.loadPlayers();
		const byId = new Map(players.map((player) => [player.playerId, player]));
		return ids
			.map((id) => byId.get(id))
			.filter((player): player is PlayerProfile => player !== undefined);
	}

	private async loadPlayers(): Promise<PlayerProfile[]>
	{
		const dir = await readdir(this.fixturesRoot).catch(() => [] as string[]);
		const files = dir.filter(
			(name) => name.startsWith("players-") && name.endsWith(".json"),
		);
		const loaded = await Promise.all(
			files.map((name) =>
				readJson<PlayerProfile[]>(path.join(this.fixturesRoot, name)).catch(() => []),
			),
		);
		return loaded.flat();
	}

	/** Recorded timecode list from `fixtures/raw/timestamps-<gamePk>.json`. */
	async fetchGameTimestamps(gamePk: number): Promise<string[]>
	{
		const file = path.join(this.fixturesRoot, "raw", `timestamps-${gamePk}.json`);
		return parseGameTimestamps(await readJson(file));
	}

	/**
   * The recorded walk in `fixtures/raw/diffpatch-<gamePk>.json` holds one entry
   * per adjacent timecode pair, so a lookup by `(start, end)` reproduces what
   * `/feed/live/diffPatch` returned. An unknown pair means no change.
   */
	async fetchGameDiffPatch(
		gamePk: number,
		startTimecode: string,
		endTimecode: string,
	): Promise<GameDiffPatchResponse>
	{
		let byPair = this.diffPatchWalks.get(gamePk);
		if (!byPair)
		{
			const file = path.join(this.fixturesRoot, "raw", `diffpatch-${gamePk}.json`);
			const walk = parseRecordedReplayWalk(await readJson(file));
			byPair = new Map(
				walk.map((step) => [`${step.startTimecode}:${step.endTimecode}`, step]),
			);
			this.diffPatchWalks.set(gamePk, byPair);
		}
		const entry = byPair.get(`${startTimecode}:${endTimecode}`);
		return [{
			diff: entry?.diff ?? [],
		}];
	}

	private async loadPlays(gamePk: number): Promise<AtBat[]>
	{
		const file = path.join(this.fixturesRoot, `plays-${gamePk}.json`);
		try
		{
			return await readJson<AtBat[]>(file);
		}
		catch
		{
			return [];
		}
	}
}

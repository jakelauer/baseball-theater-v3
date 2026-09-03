import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GameSnapshot, ScheduleDay, AtBat } from "@bt/domain";
import { rankHighlightsByImpact } from "@bt/domain";
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

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export class FixtureMlbStatsClient implements MlbStatsClient {
  constructor(private readonly fixturesRoot = FIXTURES_ROOT) {}

  async fetchSchedule(date: string): Promise<ScheduleDay> {
    const file = path.join(this.fixturesRoot, `schedule-${date}.json`);
    try {
      const data = await readJson<ScheduleFixture>(file);
      const now = new Date().toISOString();
      return {
        date: data.date,
        games: data.games,
        fetchedAt: now,
        windowMode: "cache",
      };
    } catch {
      return {
        date,
        games: [],
        fetchedAt: new Date().toISOString(),
        windowMode: "cache",
      };
    }
  }

  async fetchGame(gamePk: number): Promise<GameSnapshot> {
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

  private async loadPlays(gamePk: number): Promise<AtBat[]> {
    const file = path.join(this.fixturesRoot, `plays-${gamePk}.json`);
    try {
      return await readJson<AtBat[]>(file);
    } catch {
      return [];
    }
  }
}

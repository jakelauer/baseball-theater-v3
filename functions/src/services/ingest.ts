import type { GameSnapshot, ScheduleDay } from "@bt/domain";
import { isGameInActiveWindow, projectGame } from "@bt/domain";
import type { GameRepository, MlbStatsClient, ScheduleRepository } from "@bt/ports";
import type { GameProjectionRepository } from "./projection-store.js";

export type IngestDeps = {
  mlb: MlbStatsClient;
  schedules: ScheduleRepository;
  games: GameRepository;
  projections: GameProjectionRepository;
  now?: () => Date;
};

/**
 * One snapshot becomes five BT store documents. Callers read the projections,
 * never the upstream tree, so the snapshot upsert stays the raw-ish record and
 * the projection is what the UI binds to.
 */
async function storeGame(deps: IngestDeps, snapshot: GameSnapshot): Promise<void> {
  await deps.games.upsert(snapshot);
  await deps.projections.upsert(projectGame(snapshot));
}

export async function ingestScheduleDay(
  deps: IngestDeps,
  date: string,
): Promise<ScheduleDay> {
  const now = deps.now?.() ?? new Date();
  const fetched = await deps.mlb.fetchSchedule(date);
  const anyActive = fetched.games.some((g) => isGameInActiveWindow(g, now));
  const day: ScheduleDay = {
    ...fetched,
    fetchedAt: now.toISOString(),
    windowMode: anyActive ? "active" : "cache",
  };
  await deps.schedules.upsert(day);

  for (const summary of day.games) {
    if (!isGameInActiveWindow(summary, now) && summary.status.codedGameState !== "F") {
      continue;
    }
    try {
      const game = await deps.mlb.fetchGame(summary.gamePk);
      const snapshot: GameSnapshot = {
        ...game,
        fetchedAt: now.toISOString(),
        windowMode: day.windowMode,
      };
      await storeGame(deps, snapshot);
    } catch {
      // Fixture may omit some gamePks; schedule summary still useful.
    }
  }

  return day;
}

export async function getOrRefreshSchedule(
  deps: IngestDeps,
  date: string,
  opts?: { force?: boolean },
): Promise<ScheduleDay> {
  if (!opts?.force) {
    const existing = await deps.schedules.getByDate(date);
    if (existing) return existing;
  }
  return ingestScheduleDay(deps, date);
}

export async function getOrRefreshGame(
  deps: IngestDeps,
  gamePk: number,
  opts?: { force?: boolean },
): Promise<GameSnapshot | null> {
  if (!opts?.force) {
    const existing = await deps.games.getByPk(gamePk);
    if (existing) return existing;
  }
  try {
    const game = await deps.mlb.fetchGame(gamePk);
    const snapshot: GameSnapshot = {
      ...game,
      fetchedAt: (deps.now?.() ?? new Date()).toISOString(),
      windowMode: "cache",
    };
    await storeGame(deps, snapshot);
    return snapshot;
  } catch {
    return deps.games.getByPk(gamePk);
  }
}

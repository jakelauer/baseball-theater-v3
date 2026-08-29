import type { GameSnapshot, ScheduleDay } from "@bt/domain";

/** Upstream MLB Stats API–shaped client. Implementations: live HTTP or fixtures. */
export interface MlbStatsClient {
  fetchSchedule(date: string): Promise<ScheduleDay>;
  fetchGame(gamePk: number): Promise<GameSnapshot>;
}

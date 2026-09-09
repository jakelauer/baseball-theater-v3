import type {
  GameSnapshot,
  MediaHighlight,
  PlayerProfile,
  ScheduleDay,
  StandingsSnapshot,
} from "@bt/domain";

/** Upstream MLB Stats API–shaped client. Implementations: live HTTP or fixtures. */
export interface MlbStatsClient {
  fetchSchedule(date: string): Promise<ScheduleDay>;
  fetchGame(gamePk: number): Promise<GameSnapshot>;
  /** Highlights + editorial for one game; the only payload with playback URLs. */
  fetchGameContent(gamePk: number): Promise<MediaHighlight[]>;
  fetchStandings(date: string): Promise<StandingsSnapshot>;
  /** Identity + season lines for the given player ids, in the order returned. */
  fetchPlayers(ids: number[]): Promise<PlayerProfile[]>;
}

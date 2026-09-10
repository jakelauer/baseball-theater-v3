import type {
  GameSnapshot,
  MediaHighlight,
  PlayerProfile,
  ScheduleDay,
  StandingsSnapshot,
} from "@bt/domain";
import type { GameDiffPatchResponse } from "@bt/mlb-api";

/** Upstream MLB Stats API–shaped client. Implementations: live HTTP or fixtures. */
export interface MlbStatsClient {
  fetchSchedule(date: string): Promise<ScheduleDay>;
  fetchGame(gamePk: number): Promise<GameSnapshot>;
  /** Highlights + editorial for one game; the only payload with playback URLs. */
  fetchGameContent(gamePk: number): Promise<MediaHighlight[]>;
  fetchStandings(date: string): Promise<StandingsSnapshot>;
  /** Identity + season lines for the given player ids, in the order returned. */
  fetchPlayers(ids: number[]): Promise<PlayerProfile[]>;
  /**
   * `GET /api/v1.1/game/{gamePk}/feed/live/timestamps` — every recorded
   * timecode for a game, oldest first. Used by the post-game replay walk (S22).
   */
  fetchGameTimestamps(gamePk: number): Promise<string[]>;
  /**
   * `GET /api/v1.1/game/{gamePk}/feed/live/diffPatch?startTimecode=&endTimecode=`
   * — the RFC6902 delta between two timecodes, in MLB's one-element wrapper.
   */
  fetchGameDiffPatch(
    gamePk: number,
    startTimecode: string,
    endTimecode: string,
  ): Promise<GameDiffPatchResponse>;
}

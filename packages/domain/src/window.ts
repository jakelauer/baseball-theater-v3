import type { GameStatusCode, ScheduleGameSummary } from "./types.js";

export type CadenceParams = {
  /** Hours before scheduled start to enter active polling. */
  leadHours: number;
  /** Hours after official end to keep active polling. */
  trailHours: number;
};

export const DEFAULT_CADENCE: CadenceParams = {
  leadHours: 2,
  trailHours: 3,
};

const LIVE_CODES = new Set(["I", "P", "D"]);
const FINAL_CODES = new Set(["F", "O", "C"]);

export function isLiveStatus(code: string): boolean {
  return LIVE_CODES.has(code);
}

export function isFinalStatus(code: string): boolean {
  return FINAL_CODES.has(code);
}

export function normalizeStatusCode(code: string | undefined | null): GameStatusCode {
  if (!code) return "U";
  const c = code.toUpperCase();
  if (["S", "P", "I", "F", "O", "C", "D"].includes(c)) return c as GameStatusCode;
  return "U";
}

/**
 * Whether a game should be in the active ingest window at `now`.
 * Uses officialDate + rough day bounds when precise start/end are unknown.
 */
export function isGameInActiveWindow(
  game: Pick<ScheduleGameSummary, "officialDate" | "status"> & {
    gameDateTime?: string | null;
  },
  now: Date,
  params: CadenceParams = DEFAULT_CADENCE,
): boolean {
  const code = normalizeStatusCode(game.status.codedGameState);
  if (isLiveStatus(code)) return true;

  const start = game.gameDateTime
    ? new Date(game.gameDateTime)
    : new Date(`${game.officialDate}T17:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return false;

  const leadMs = params.leadHours * 60 * 60 * 1000;
  const trailMs = params.trailHours * 60 * 60 * 1000;

  if (isFinalStatus(code)) {
    // Without exact end time, keep trail from a late-evening assumption on game day.
    const assumedEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    return now.getTime() <= assumedEnd.getTime() + trailMs;
  }

  return (
    now.getTime() >= start.getTime() - leadMs &&
    now.getTime() <= start.getTime() + trailMs
  );
}

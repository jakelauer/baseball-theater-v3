import type { GameStatusCode, ScheduleGameSummary } from "./types.js";

export type CadenceParams = {
  /** Hours before scheduled start to enter active polling. */
  leadHours: number;
  /** Hours after official end to keep active polling. */
  trailHours: number;
  /** How often the active-window ingest loop ticks, in milliseconds. */
  intervalMs: number;
};

/**
 * The ADR-002 cadence knobs, in one place so lead, trail and the poll interval
 * cannot drift apart.
 *
 * ADR-002 fixes the *shape* (a lead/trail active window with a backend poll)
 * and leaves the exact durations as tunable parameters. Defaults:
 *
 * - `leadHours: 2` — start polling two hours before first pitch
 * - `trailHours: 3` — keep polling three hours past the assumed end
 * - `intervalMs: 30_000` — one pull per in-window game every 30s. Egress scales
 *   with concurrent game windows, not viewers; raise it before adding games.
 */
export const DEFAULT_CADENCE: CadenceParams = {
  leadHours: 2,
  trailHours: 3,
  intervalMs: 30_000,
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
    gameDate?: string | null;
    gameDateTime?: string | null;
  },
  now: Date,
  params: CadenceParams = DEFAULT_CADENCE,
): boolean {
  const code = normalizeStatusCode(game.status.codedGameState);
  if (isLiveStatus(code)) return true;

  // `ScheduleGameSummary` carries the real first pitch as `gameDate`;
  // `gameDateTime` is accepted as an alias. Without either, fall back to a
  // mid-afternoon assumption — that fallback is a floor, not the normal path.
  const startedAt = game.gameDate ?? game.gameDateTime;
  const start = startedAt
    ? new Date(startedAt)
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

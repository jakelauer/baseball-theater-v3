import type { PitchEvent } from "./plays.js";

/** What a pitch did, as the pitch views color it: the three pitch tokens in VISUAL-DESIGN §3. */
export type PitchOutcome = "ball" | "strike" | "inPlay";

/**
 * The one reading of a pitch's result (ADR-025). MLB marks a ball in play with
 * `isInPlay` and not `isStrike`; fouls and swinging / called strikes carry
 * `isStrike`. Anything else — balls, hit-by-pitch, automatic balls, pitchouts —
 * reads as a ball. MLB's own `ballColor` is ignored: BT colors pitches with its
 * own tokens.
 */
export function pitchOutcome(pitch: Pick<PitchEvent, "details">): PitchOutcome
{
	if (pitch.details.isInPlay) return "inPlay";
	if (pitch.details.isStrike) return "strike";
	return "ball";
}

/**
 * MLB's call codes for a swing and a miss: swinging strike, swinging strike (blocked),
 * foul tip (caught, so a strike the batter swung through), missed bunt, swinging
 * pitchout. Fouls are swings too but are not swinging strikes.
 */
const SWINGING_STRIKE_CALLS = new Set(["S", "W", "T", "M", "Q"]);

/**
 * Whether a strike came from the batter swinging rather than the umpire's call — the
 * zone draws these with a dotted outline (owner, 2026-10-29: "Swinging strikes and
 * called strikes should have a slightly different visual treatment in the strike
 * zone. I propose a dotted outline for swinging strikes").
 */
export function isSwingingStrike(pitch: Pick<PitchEvent, "details">): boolean
{
	return pitchOutcome(pitch) === "strike" && SWINGING_STRIKE_CALLS.has(pitch.details.call ?? "");
}

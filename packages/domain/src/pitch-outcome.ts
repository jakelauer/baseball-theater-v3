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

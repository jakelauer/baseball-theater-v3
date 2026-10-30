/**
 * What the Plays room (S41; game-rooms `plays-*` frames) derives from a game's at-bats:
 * which inning it opens on, an inning's two halves, the game's scoring plays and the
 * score after each. One implementation each (ADR-025); the room only draws them.
 */
import type { AtBat } from "./plays.js";

/**
 * The inning Plays opens on: the latest one with any at-bat to show (owner, 2026-10-14:
 * "By default, it should show the most recent inning that has any actual information to
 * show"). An inning the linescore has started but no at-bat has reached yet doesn't
 * count. `null` before the first at-bat.
 */
export function defaultPlaysInning(plays: readonly AtBat[]): number | null
{
	return plays.reduce<number | null>((latest, play) => Math.max(latest ?? 0, play.about.inning), null);
}

/** One inning's at-bats, top half and bottom half, each in the order they were batted. */
export function inningHalves(plays: readonly AtBat[], inning: number): { top: AtBat[];
	bottom: AtBat[] }
{
	const of = (half: AtBat["about"]["halfInning"]) => plays.filter((play) => play.about.inning === inning && play.about.halfInning === half);
	return {
		top: of("top"),
		bottom: of("bottom"),
	};
}

/** Every at-bat that scored a run, in game order, not grouped by inning (the Runs view, `plays-scoring-mobile`). */
export function scoringPlays(plays: readonly AtBat[]): AtBat[]
{
	return plays.filter((play) => play.about.isScoringPlay);
}

/**
 * The score after a play as the frames write it: the leading team then its score
 * first (`MIA 6–5`), or the bare score when tied (`2–2`). `null` when MLB didn't record
 * the score on the play.
 */
export function scoreAfterLabel(play: AtBat, away: string, home: string): string | null
{
	const { awayScore, homeScore } = play.result;
	if (awayScore === null || homeScore === null) return null;
	if (awayScore === homeScore) return `${awayScore}–${homeScore}`;
	return awayScore > homeScore ? `${away} ${awayScore}–${homeScore}` : `${home} ${homeScore}–${awayScore}`;
}

/**
 * The boxed-inning linescore's cells (S2; game-rooms Box and Plays frames). One
 * calculation for every view that draws innings (ADR-025): Box and Plays (S41) call it
 * and only format the result.
 */
import type { LinescoreSummary } from "./types.js";

/** One team's row: a cell per inning (`null` = an empty box) and the run total. */
export type LinescoreRow = {
	cells: (number | null)[];
	runs: number;
};

export type LinescoreCells = {
	/** Inning numbers for the header, 1…n. */
	innings: number[];
	away: LinescoreRow;
	home: LinescoreRow;
};

/**
 * The cells to draw: at least `scheduledInnings` boxes per team (unplayed ones empty),
 * more when the game went to extra innings. Each row's `runs` is the sum of its cells,
 * so the R column and the boxes can never disagree.
 */
export function linescoreCells(linescore: Pick<LinescoreSummary, "innings"> | null, scheduledInnings: number): LinescoreCells
{
	const played = linescore?.innings ?? [];
	const count = Math.max(scheduledInnings, played.length);
	const innings = Array.from({
		length: count,
	}, (_, i) => i + 1);
	const row = (side: "away" | "home"): LinescoreRow =>
	{
		const cells = innings.map((num) => played.find((inning) => inning.num === num)?.[side].runs ?? null);
		return {
			cells,
			runs: cells.reduce<number>((sum, runs) => sum + (runs ?? 0), 0),
		};
	};
	return {
		innings,
		away: row("away"),
		home: row("home"),
	};
}

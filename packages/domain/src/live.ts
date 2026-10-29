/**
 * What the Live room derives from a game in progress (S63; game-rooms Live frames):
 * which bases are occupied, where a pitch crossed the zone in words, and its break in
 * inches. One implementation each (ADR-025); the Live theater (S64) only renders them.
 */
import type { PitchBreaks } from "./plays.js";
import type { GameLive } from "./types.js";

/** Occupied bases for the diamond, in order first · second · third. */
export type BaseRunners = {
	first: boolean;
	second: boolean;
	third: boolean;
};

/** Which bases have a runner. No live moment (a game not in progress) is bases empty. */
export function baseRunners(live: GameLive | null | undefined): BaseRunners
{
	return {
		first: live?.runners.first != null,
		second: live?.runners.second != null,
		third: live?.runners.third != null,
	};
}

const ROWS = ["Up", "Middle", "Down"] as const;
const COLUMNS = ["Left", "Middle", "Right"] as const;

/** MLB's out-of-zone areas, around the 3 × 3 grid. */
const OUTSIDE: Readonly<Record<number, string>> = {
	11: "Outside, Up-Left",
	12: "Outside, Up-Right",
	13: "Outside, Down-Left",
	14: "Outside, Down-Right",
};

/**
 * A pitch's location in words (the frames' "Zone location: Middle-Middle"). MLB numbers
 * the strike zone 1–9 as a 3 × 3 grid from the catcher's view, top-left first, and the
 * four areas around it 11–14. `null` for no zone or a number MLB doesn't use.
 */
export function zoneLabel(zone: number | null | undefined): string | null
{
	if (zone == null) return null;
	if (zone >= 1 && zone <= 9)
	{
		const index = zone - 1;
		return `${ROWS[Math.floor(index / 3)]}-${COLUMNS[index % 3]}`;
	}
	return OUTSIDE[zone] ?? null;
}

/** A pitch's movement for display: inches, one decimal, as magnitudes. */
export type BreakInches = {
	horizontal: number;
	vertical: number;
};

/**
 * Horizontal and vertical break in inches, rounded to a tenth, as magnitudes (the
 * frames read "14.2 in / 7.8 in"; direction is not drawn). `null` when MLB sent
 * neither number.
 */
export function breakInches(breaks: PitchBreaks | null | undefined): BreakInches | null
{
	const h = breaks?.breakHorizontal;
	const v = breaks?.breakVertical;
	if (h == null || v == null) return null;
	const tenth = (n: number): number => Math.round(Math.abs(n) * 10) / 10;
	return {
		horizontal: tenth(h),
		vertical: tenth(v),
	};
}

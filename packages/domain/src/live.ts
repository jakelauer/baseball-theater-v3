/**
 * What the Live room derives from a game in progress (S63; game-rooms Live frames):
 * which bases are occupied, where a pitch crossed the zone in words, and its break in
 * inches. One implementation each (ADR-025); the Live theater (S64) only renders them.
 */
import { pitchOutcome } from "./pitch-outcome.js";
import type { AtBat, PitchBreaks } from "./plays.js";
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

/** A pitcher's work so far (the frames' "94 Pitches (61 S)"). */
export type PitcherLine = {
	pitches: number;
	strikes: number;
};

/**
 * Pitches and strikes a pitcher has thrown through one at-bat (S64): every pitch of
 * every at-bat up to and including `throughAtBatIndex`, the current at-bat's pitches
 * so far among them. A strike is any pitch that isn't a ball — called, swinging,
 * foul or put in play — as MLB counts a pitcher's strikes. Totals stop at that at-bat,
 * so opening an early at-bat spoils nothing (owner, 2026-10-19).
 */
export function pitcherLine(plays: readonly AtBat[], pitcherId: number, throughAtBatIndex: number): PitcherLine
{
	const pitches = plays
		.filter((play) => play.about.atBatIndex <= throughAtBatIndex && play.matchup.pitcher.id === pitcherId)
		.flatMap((play) => play.pitches);
	return {
		pitches: pitches.length,
		strikes: pitches.filter((pitch) => pitchOutcome(pitch) !== "ball").length,
	};
}

/** A batter's game so far (the frames' "2-3, HR, 3 RBI"). */
export type BatterLine = {
	atBats: number;
	hits: number;
	homeRuns: number;
	rbi: number;
};

const HITS = new Set(["single", "double", "triple", "home_run"]);

/** Plate appearances that are not at-bats (MLB's scoring rules). */
const NOT_AT_BATS = new Set([
	"walk", "intent_walk", "hit_by_pitch", "catcher_interf",
	"sac_fly", "sac_bunt", "sac_fly_double_play", "sac_bunt_double_play",
]);

/** Plays that end on a runner, not the batter: no plate appearance at all. */
const RUNNER_EVENT = /^(caught_stealing|pickoff|stolen_base|wild_pitch|passed_ball|balk|other_advance|defensive_indiff|runner_)/;

/**
 * A batter's hits, at-bats, home runs and RBI through one at-bat (S64): only finished
 * plate appearances up to and including `throughAtBatIndex` count, so the at-bat still
 * in progress adds nothing until it ends. Walks, hit-by-pitch, sacrifices and catcher's
 * interference are not at-bats; a play that ends on a runner (caught stealing, pickoff)
 * is not the batter's plate appearance at all.
 */
export function batterLine(plays: readonly AtBat[], batterId: number, throughAtBatIndex: number): BatterLine
{
	const done = plays.filter((play) => play.about.atBatIndex <= throughAtBatIndex
		&& play.about.isComplete
		&& play.matchup.batter.id === batterId
		&& !RUNNER_EVENT.test(play.result.eventType));
	return {
		atBats: done.filter((play) => !NOT_AT_BATS.has(play.result.eventType)).length,
		hits: done.filter((play) => HITS.has(play.result.eventType)).length,
		homeRuns: done.filter((play) => play.result.eventType === "home_run").length,
		rbi: done.reduce((sum, play) => sum + play.result.rbi, 0),
	};
}

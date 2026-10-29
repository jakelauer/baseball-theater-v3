export type GameStatusCode =
  | "S" // scheduled
  | "P" // pregame
  | "I" // in progress / live
  | "F" // final
  | "O" // game over
  | "C" // cancelled
  | "D" // delayed
  | "U"; // unknown

export type AbstractTeam = {
	id: number;
	abbreviation: string;
	name: string;
	teamName: string;
};

export type LinescoreSummary = {
	currentInning: number | null;
	inningState: string | null;
	isTopInning: boolean | null;
	outs: number | null;
	balls: number | null;
	strikes: number | null;
	teams: {
		home: { runs: number | null;
			hits: number | null;
			errors: number | null };
		away: { runs: number | null;
			hits: number | null;
			errors: number | null };
	};
};

export type MediaHighlight = {
	id: string;
	playId: string | null;
	title: string;
	blurb: string | null;
	duration: string | null;
	imageUrl: string | null;
	playbackUrl: string | null;
};

import type { AtBat } from "./plays.js";

export type GameSnapshot = {
	gamePk: number;
	gameDate: string; // YYYY-MM-DD (schedule date)
	officialDate: string;
	status: {
		abstractGameState: string;
		codedGameState: GameStatusCode | string;
		detailedState: string;
	};
	teams: {
		home: AbstractTeam;
		away: AbstractTeam;
	};
	venue: { id: number;
		name: string } | null;
	linescore: LinescoreSummary | null;
	highlights: MediaHighlight[];
	plays: AtBat[];
	fetchedAt: string; // ISO
	windowMode: "active" | "cache";
	/** ADR-022: monotonic per game; bumps only when the content changes (`stampVersion`). */
	version: number;
	/** ISO time the content last changed — not the last poll, which is `fetchedAt`. */
	lastChangedAt: string;
};

export type ScheduleGameSummary = {
	gamePk: number;
	gameDate: string;
	officialDate: string;
	status: GameSnapshot["status"];
	teams: GameSnapshot["teams"];
	venue: GameSnapshot["venue"];
	linescore: LinescoreSummary | null;
};

export type ScheduleDay = {
	date: string; // YYYY-MM-DD
	games: ScheduleGameSummary[];
	fetchedAt: string;
	windowMode: "active" | "cache";
	/** ADR-022: monotonic per day; bumps only when the content changes (`stampVersion`). */
	version: number;
	/** ISO time the content last changed — not the last poll, which is `fetchedAt`. */
	lastChangedAt: string;
};

export type PatronTier =
  "none" | "Backer" | "Pro Backer" | "Star Backer" | "Premium Sponsor";

export type Entitlements = {
	tier: PatronTier;
	fasterLiveRefresh: boolean;
	cloudSyncedSettings: boolean;
	savantLinks: boolean;
};

/** What a user may administer. Lives in BT, not the identity provider (ADR-019: no provider RBAC). */
export type Role = "member" | "admin";

export type UserProfile = {
	/** BT's own user ID (ADR-019); provider accounts link to it, never the reverse. */
	uid: string;
	/** Every account has an email (owner, 2026-10-28: "It should be impossible for an account to have no email."; S82). */
	email: string;
	displayName: string | null;
	patreonUserId: string | null;
	role: Role;
	entitlements: Entitlements;
	createdAt: string;
	updatedAt: string;
};

/**
 * What BT's own signed session carries (ADR-019): enough to authorize an
 * ordinary request without reading Postgres or calling the identity provider.
 * Role and entitlements are a copy as of sign-in, so a change reaches the
 * session when it is next issued. Times are Unix seconds.
 */
export type BtSession = {
	uid: string;
	role: Role;
	entitlements: Entitlements;
	issuedAt: number;
	expiresAt: number;
};

/**
 * One team's row in a standings table.
 *
 * MLB reports games-back and the elimination figures as strings, using `"-"`
 * for "not applicable". The mapper normalizes that sentinel to `null` so the
 * UI never has to special-case a dash.
 */
export type StandingsTeamRecord = {
	teamId: number;
	name: string;
	abbreviation: string | null;
	wins: number;
	losses: number;
	pct: string | null;
	gamesBack: string | null;
	divisionRank: number | null;
	streak: string | null;
	runsScored: number | null;
	runsAllowed: number | null;
	runDifferential: number | null;
	divisionLeader: boolean;
	clinched: boolean;
	eliminationNumber: string | null;
};

export type StandingsDivision = {
	divisionId: number | null;
	name: string | null;
	leagueId: number | null;
	teams: StandingsTeamRecord[];
};

export type StandingsSnapshot = {
	date: string; // YYYY-MM-DD
	divisions: StandingsDivision[];
	fetchedAt: string;
	windowMode: "active" | "cache";
};

/** A player's season line for one stat group, as BT displays it. */
export type PlayerSeasonLine = {
	season: string;
	group: string; // "hitting" | "pitching" | "fielding"
	teamId: number | null;
	gamesPlayed: number | null;
	avg: string | null;
	obp: string | null;
	slg: string | null;
	ops: string | null;
	homeRuns: number | null;
	rbi: number | null;
	era: string | null;
	wins: number | null;
	losses: number | null;
	strikeOuts: number | null;
	inningsPitched: string | null;
};

/** Identity + season bag for one player. */
export type PlayerProfile = {
	playerId: number;
	fullName: string;
	boxscoreName: string | null;
	primaryNumber: string | null;
	position: string | null;
	batSide: string | null;
	pitchHand: string | null;
	birthDate: string | null;
	currentAge: number | null;
	active: boolean;
	seasons: PlayerSeasonLine[];
};

export type FreshnessMeta = {
	fetchedAt: string;
	windowMode: "active" | "cache";
	stale: boolean;
};

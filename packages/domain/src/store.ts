/**
 * BT store shapes — the documents ingest writes and the UI reads.
 *
 * These are BT's own documents, not upstream trees: each one is small enough to
 * fetch, cache, and patch on its own, and each carries the freshness metadata a
 * reader needs to decide whether to refresh. See `docs/v3/ARCHITECTURE.md`
 * (§ BT store shapes).
 */
import type { AtBat } from "./plays.js";
import type {
	AbstractTeam,
	GameSnapshot,
	LinescoreSummary,
	MediaHighlight,
} from "./types.js";

/** Every store document is keyed by game and stamped with its freshness. */
export type GameDocumentMeta = {
	gamePk: number;
	fetchedAt: string;
	windowMode: "active" | "cache";
};

/** Who is playing, where, and what the game's state is. */
export type GameHeaderDoc = GameDocumentMeta & {
	gameDate: string;
	officialDate: string;
	status: GameSnapshot["status"];
	teams: { home: AbstractTeam;
		away: AbstractTeam };
	venue: { id: number;
		name: string } | null;
};

/** The scoreboard line: innings, count, outs. */
export type GameLinescoreDoc = GameDocumentMeta & {
	linescore: LinescoreSummary | null;
};

/** Every at-bat in the game, in order. */
export type GamePlaysDoc = GameDocumentMeta & {
	plays: AtBat[];
	playCount: number;
};

/** One line in a team's batting table. */
export type BoxscoreBattingRow = {
	playerId: number;
	name: string;
	plateAppearances: number;
};

/** One line in a team's pitching table. */
export type BoxscorePitchingRow = {
	playerId: number;
	name: string;
	battersFaced: number;
};

export type BoxscoreTeamTable = {
	teamId: number;
	abbreviation: string;
	batting: BoxscoreBattingRow[];
	pitching: BoxscorePitchingRow[];
};

export type GameBoxscoreDoc = GameDocumentMeta & {
	teams: { home: BoxscoreTeamTable;
		away: BoxscoreTeamTable };
};

/** Highlights and editorial video for the game, when content is present. */
export type GameMediaDoc = GameDocumentMeta & {
	highlights: MediaHighlight[];
};

/** The five documents one ingested game produces. */
export type GameProjection = {
	header: GameHeaderDoc;
	linescore: GameLinescoreDoc;
	plays: GamePlaysDoc;
	boxscore: GameBoxscoreDoc;
	media: GameMediaDoc;
};

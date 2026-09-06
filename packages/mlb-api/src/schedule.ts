/**
 * `GET /api/v1/schedule` — the scoreboard payload.
 */
import type {
  GameStatus,
  LeagueRecord,
  MlbRef,
  MlbTeam,
  Person,
  Venue,
} from "./common.js";
import type { Linescore } from "./linescore.js";

export interface ScheduleResponse {
  copyright?: string;
  totalItems?: number;
  totalEvents?: number;
  totalGames?: number;
  totalGamesInProgress?: number;
  dates: ScheduleDate[];
}

export interface ScheduleDate {
  date: string;
  totalItems?: number;
  totalGames?: number;
  totalGamesInProgress?: number;
  games: ScheduleGame[];
  events?: unknown[];
}

export interface ScheduleGame {
  gamePk: number;
  gameGuid?: string;
  link?: string;
  gameType?: string;
  season?: string;
  gameDate: string;
  officialDate?: string;
  status: GameStatus;
  teams: ScheduleGameTeams;
  venue?: Venue;
  linescore?: Linescore;
  content?: ScheduleGameContent;
  isTie?: boolean;
  gameNumber?: number;
  doubleHeader?: string;
  dayNight?: string;
  scheduledInnings?: number;
  seriesDescription?: string;
  seriesGameNumber?: number;
  gamesInSeries?: number;
  seriesStatus?: SeriesStatus;
  broadcasts?: Broadcast[];
  flags?: ScheduleGameFlags;
}

export interface ScheduleGameTeams {
  away: ScheduleGameTeam;
  home: ScheduleGameTeam;
}

/** One side of a scheduled game: record, score, and the hydrated team. */
export interface ScheduleGameTeam {
  team: MlbTeam;
  score?: number;
  isWinner?: boolean;
  splitSquad?: boolean;
  seriesNumber?: number;
  leagueRecord?: LeagueRecord;
  probablePitcher?: Person;
}

export interface SeriesStatus {
  gameNumber?: number;
  totalGames?: number;
  isTied?: boolean;
  isOver?: boolean;
  shortDescription?: string;
  description?: string;
  result?: string;
}

export interface Broadcast extends MlbRef {
  type?: string;
  language?: string;
  homeAway?: string;
  isNational?: boolean;
  callSign?: string;
}

export interface ScheduleGameFlags {
  noHitter?: boolean;
  perfectGame?: boolean;
  awayTeamNoHitter?: boolean;
  awayTeamPerfectGame?: boolean;
  homeTeamNoHitter?: boolean;
  homeTeamPerfectGame?: boolean;
}

/** The `game(content(...))` hydrate — a summary pointer, not the full content payload. */
export interface ScheduleGameContent {
  link?: string;
  summary?: ScheduleContentSummary;
}

export interface ScheduleContentSummary {
  hasPreviewArticle?: boolean;
  hasRecapArticle?: boolean;
  hasWrapArticle?: boolean;
  hasHighlightsVideo?: boolean;
}

/**
 * `GET /api/v1.1/game/{gamePk}/feed/live` — the play-by-play payload that
 * carries Statcast pitch data.
 */
import type {
  CodedDescription,
  GameStatus,
  MlbRef,
  MlbTeam,
  Person,
  Venue,
} from "./common.js";
import type { Linescore } from "./linescore.js";

/** The live feed and the schedule hydrate return the same linescore shape. */
export type LiveLinescore = Linescore;

export interface LiveFeedResponse {
  copyright?: string;
  gamePk: number;
  link?: string;
  metaData?: LiveFeedMetaData;
  gameData: LiveGameData;
  liveData: LiveData;
}

export interface LiveFeedMetaData {
  wait?: number;
  timeStamp?: string;
  gameEvents?: string[];
  logicalEvents?: string[];
}

export interface LiveGameData {
  game?: LiveGameInfo;
  datetime?: LiveDatetime;
  status: GameStatus;
  teams: LiveGameTeams;
  venue: Venue;
  players?: Record<string, Person>;
  weather?: LiveWeather;
  probablePitchers?: LiveProbablePitchers;
}

export interface LiveGameInfo {
  pk?: number;
  type?: string;
  doubleHeader?: string;
  gameNumber?: number;
  season?: string;
  seasonDisplay?: string;
}

export interface LiveDatetime {
  dateTime?: string;
  originalDate?: string;
  officialDate?: string;
  dayNight?: string;
  time?: string;
  ampm?: string;
}

export interface LiveGameTeams {
  away: MlbTeam;
  home: MlbTeam;
}

export interface LiveWeather {
  condition?: string;
  temp?: string;
  wind?: string;
}

export interface LiveProbablePitchers {
  away?: Person;
  home?: Person;
}

export interface LiveData {
  plays: LivePlays;
  linescore: LiveLinescore;
  boxscore?: LiveBoxscore;
  decisions?: LiveDecisions;
}

export interface LivePlays {
  allPlays: LiveGamePlay[];
  currentPlay?: LiveGamePlay;
  scoringPlays?: number[];
  playsByInning?: LivePlaysByInning[];
}

export interface LivePlaysByInning {
  startIndex?: number;
  endIndex?: number;
  top?: number[];
  bottom?: number[];
}

/** One at-bat. `playEvents` is every pitch and action inside it. */
export interface LiveGamePlay {
  result: PlayResult;
  about: PlayAbout;
  count?: PlayCount;
  matchup?: PlayMatchup;
  playEvents: LiveGamePlayEvent[];
  runners?: PlayRunner[];
  atBatIndex?: number;
  pitchIndex?: number[];
  actionIndex?: number[];
  runnerIndex?: number[];
  playEndTime?: string;
}

export interface PlayResult {
  type?: string;
  event?: string;
  eventType?: string;
  description?: string;
  rbi?: number;
  awayScore?: number;
  homeScore?: number;
  isOut?: boolean;
}

export interface PlayAbout {
  atBatIndex: number;
  halfInning: string;
  isTopInning: boolean;
  inning: number;
  isComplete?: boolean;
  isScoringPlay?: boolean;
  hasReview?: boolean;
  hasOut?: boolean;
  captivatingIndex?: number;
  startTime?: string;
  endTime?: string;
}

export interface PlayCount {
  balls?: number;
  strikes?: number;
  outs?: number;
}

export interface PlayMatchup {
  batter?: Person;
  pitcher?: Person;
  batSide?: CodedDescription;
  pitchHand?: CodedDescription;
  splits?: PlayMatchupSplits;
}

export interface PlayMatchupSplits {
  batter?: string;
  pitcher?: string;
  menOnBase?: string;
}

export interface PlayRunner {
  movement?: RunnerMovement;
  details?: RunnerDetails;
}

export interface RunnerMovement {
  originBase?: string | null;
  start?: string | null;
  end?: string | null;
  outBase?: string | null;
  isOut?: boolean | null;
  outNumber?: number | null;
}

export interface RunnerDetails {
  event?: string;
  eventType?: string;
  runner?: Person;
  isScoringEvent?: boolean;
  rbi?: boolean;
  earned?: boolean;
  playIndex?: number;
}

/** A single pitch or action within an at-bat. */
export interface LiveGamePlayEvent {
  index: number;
  isPitch: boolean;
  type?: string;
  playId?: string;
  pitchNumber?: number;
  startTime?: string;
  endTime?: string;
  details?: PlayEventDetails;
  count?: PlayCount;
  pitchData?: PitchData;
  hitData?: HitData;
}

export interface PlayEventDetails {
  call?: CodedDescription;
  description?: string;
  code?: string;
  ballColor?: string;
  trailColor?: string;
  isInPlay?: boolean;
  isStrike?: boolean;
  isBall?: boolean;
  isOut?: boolean;
  hasReview?: boolean;
  type?: PitchType;
}

export interface PitchType {
  code?: string;
  description?: string;
}

/** Statcast measurements for one pitch. */
export interface PitchData {
  startSpeed?: number;
  endSpeed?: number;
  strikeZoneTop?: number;
  strikeZoneBottom?: number;
  strikeZoneWidth?: number;
  strikeZoneDepth?: number;
  zone?: number;
  typeConfidence?: number;
  plateTime?: number;
  extension?: number;
  coordinates?: PitchCoordinates;
  breaks?: PitchBreaks;
}

/**
 * `pX`/`pZ` are plate crossing in feet; `x`/`y` are the legacy Gameday pixel
 * coordinates; the rest are the 9-parameter trajectory constants.
 */
export interface PitchCoordinates {
  pX?: number;
  pZ?: number;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  z0?: number;
  vX0?: number;
  vY0?: number;
  vZ0?: number;
  aX?: number;
  aY?: number;
  aZ?: number;
  pfxX?: number;
  pfxZ?: number;
}

export interface PitchBreaks {
  breakAngle?: number;
  breakLength?: number;
  breakY?: number;
  breakVertical?: number;
  breakVerticalInduced?: number;
  breakHorizontal?: number;
  spinRate?: number;
  spinDirection?: number;
}

export interface HitData {
  launchSpeed?: number;
  launchAngle?: number;
  totalDistance?: number;
  trajectory?: string;
  hardness?: string;
  location?: string;
  coordinates?: HitCoordinates;
}

export interface HitCoordinates {
  coordX?: number;
  coordY?: number;
}

export interface LiveBoxscore {
  teams?: LiveBoxscoreTeams;
  officials?: unknown[];
}

export interface LiveBoxscoreTeams {
  away?: LiveBoxscoreTeam;
  home?: LiveBoxscoreTeam;
}

export interface LiveBoxscoreTeam {
  team?: MlbTeam;
  batters?: number[];
  pitchers?: number[];
  bench?: number[];
  bullpen?: number[];
  battingOrder?: number[];
}

export interface LiveDecisions {
  winner?: Person;
  loser?: Person;
  save?: Person;
}

/** Re-exported so consumers can name the referenced entity shape. */
export type LiveMlbRef = MlbRef;

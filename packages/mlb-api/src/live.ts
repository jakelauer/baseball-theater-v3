/**
 * `GET /api/v1.1/game/{gamePk}/feed/live` — the play-by-play payload that
 * carries Statcast pitch data.
 */
import type {
  CodedDescription,
  CountState,
  GameStatus,
  HomeAwayPair,
  MlbLink,
  MlbRef,
  MlbTeam,
  Person,
  Position,
  TeamUsageCount,
  Venue,
} from "./common.js";
import type { Linescore } from "./linescore.js";
import type { HotColdZone, HotColdZoneStats, StatGroups } from "./stats.js";

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
  officialVenue?: MlbLink;
  players?: Record<string, Person>;
  weather?: LiveWeather;
  gameInfo?: LiveGameInfoDetail;
  review?: LiveGameReview;
  flags?: LiveGameFlags;
  alerts?: unknown[];
  probablePitchers?: LiveProbablePitchers;
  officialScorer?: Person;
  primaryDatacaster?: Person;
  moundVisits?: LiveMoundVisits;
  absChallenges?: LiveAbsChallenges;
}

export interface LiveGameInfo {
  pk?: number;
  type?: string;
  doubleHeader?: string;
  id?: string;
  gamedayType?: string;
  tiebreaker?: string;
  gameNumber?: number;
  calendarEventID?: string;
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

export type LiveGameTeams = Required<HomeAwayPair<MlbTeam>>;

export interface LiveWeather {
  condition?: string;
  temp?: string;
  wind?: string;
}

/** Facts only known once the game is under way. */
export interface LiveGameInfoDetail {
  attendance?: number;
  firstPitch?: string;
  gameDurationMinutes?: number;
}

/** Manager challenges left per side. */
export interface LiveGameReview extends HomeAwayPair<TeamUsageCount> {
  hasChallenges?: boolean;
}

/** Automated ball-strike challenges — same counters, plus the outcome split. */
export interface LiveAbsChallenges extends HomeAwayPair<AbsChallengeUsage> {
  hasChallenges?: boolean;
}

export interface AbsChallengeUsage {
  remaining?: number;
  usedSuccessful?: number;
  usedFailed?: number;
}

export type LiveMoundVisits = HomeAwayPair<TeamUsageCount>;

export interface LiveGameFlags {
  noHitter?: boolean;
  perfectGame?: boolean;
  awayTeamNoHitter?: boolean;
  awayTeamPerfectGame?: boolean;
  homeTeamNoHitter?: boolean;
  homeTeamPerfectGame?: boolean;
}

export type LiveProbablePitchers = HomeAwayPair<Person>;

export interface LiveData {
  plays: LivePlays;
  linescore: LiveLinescore;
  boxscore?: LiveBoxscore;
  decisions?: LiveDecisions;
  leaders?: LiveLeaders;
}

/**
 * Statcast leaderboards for the game. MLB has returned `{}` for all three in
 * every recorded payload, so the board's own shape is deliberately unmodeled.
 */
export interface LiveLeaders {
  hitDistance?: LiveLeaderBoard;
  hitSpeed?: LiveLeaderBoard;
  pitchSpeed?: LiveLeaderBoard;
}

export type LiveLeaderBoard = unknown;

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
  hits?: HomeAwayPair<LiveInningHit[]>;
}

/** One batted ball placed on the spray chart for an inning. */
export interface LiveInningHit {
  team?: MlbTeam;
  inning?: number;
  pitcher?: Person;
  batter?: Person;
  coordinates?: SprayChartCoordinates;
  type?: string;
  description?: string;
}

/** Gameday field pixels, origin at home plate. */
export interface SprayChartCoordinates {
  x?: number;
  y?: number;
}

/** One at-bat. `playEvents` is every pitch and action inside it. */
export interface LiveGamePlay {
  result: PlayResult;
  about: PlayAbout;
  count?: PlayCount;
  matchup?: PlayMatchup;
  playEvents: LiveGamePlayEvent[];
  runners?: PlayRunner[];
  reviewDetails?: PlayReviewDetails;
  atBatIndex?: number;
  pitchIndex?: number[];
  actionIndex?: number[];
  runnerIndex?: number[];
  playEndTime?: string;
}

/**
 * What happened, in the vocabulary MLB reuses for an at-bat's result and for
 * the details of the pitch that produced it.
 */
export interface PlayOutcomeSummary {
  event?: string;
  eventType?: string;
  description?: string;
  awayScore?: number;
  homeScore?: number;
  isOut?: boolean;
}

export interface PlayResult extends PlayOutcomeSummary {
  /** The kind of play, e.g. `atBat` — not the pitch type. */
  type?: string;
  rbi?: number;
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

/** A play's count is the same three numbers the linescore reports. */
export type PlayCount = CountState;

export interface PlayMatchup {
  batter?: Person;
  pitcher?: Person;
  batSide?: CodedDescription;
  pitchHand?: CodedDescription;
  postOnFirst?: Person;
  postOnSecond?: Person;
  postOnThird?: Person;
  batterHotColdZones?: HotColdZone[];
  pitcherHotColdZones?: HotColdZone[];
  batterHotColdZoneStats?: HotColdZoneStats;
  pitcherHotColdZoneStats?: HotColdZoneStats;
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
  credits?: PlayRunnerCredit[];
}

/** Which fielder gets the assist/putout on a runner's movement. */
export interface PlayRunnerCredit {
  player?: Person;
  position?: Position;
  credit?: string;
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
  movementReason?: string | null;
  runner?: Person;
  responsiblePitcher?: Person | null;
  isScoringEvent?: boolean;
  rbi?: boolean;
  earned?: boolean;
  teamUnearned?: boolean;
  playIndex?: number;
}

/** A single pitch or action within an at-bat. */
export interface LiveGamePlayEvent {
  index: number;
  isPitch: boolean;
  isSubstitution?: boolean;
  type?: string;
  playId?: string;
  pitchNumber?: number;
  startTime?: string;
  endTime?: string;
  details?: PlayEventDetails;
  count?: PlayCount;
  pitchData?: PitchData;
  hitData?: HitData;
  /** Substitution actions name the player coming in and going out. */
  player?: Person;
  replacedPlayer?: Person;
  position?: Position;
  battingOrder?: string;
  reviewDetails?: PlayReviewDetails;
}

export interface PlayReviewDetails {
  isOverturned?: boolean;
  inProgress?: boolean;
  reviewType?: string;
  challengeTeamId?: number;
  player?: Person;
}

export interface PlayEventDetails extends PlayOutcomeSummary {
  call?: CodedDescription;
  code?: string;
  ballColor?: string;
  trailColor?: string;
  isInPlay?: boolean;
  isStrike?: boolean;
  isBall?: boolean;
  isScoringPlay?: boolean;
  hasReview?: boolean;
  runnerGoing?: boolean;
  fromCatcher?: boolean;
  disengagementNum?: number;
  violation?: PlayViolation;
  /** The pitch thrown — a coded object, unlike `PlayResult.type`. */
  type?: PitchType;
}

/** Pitch timer, defensive positioning, and batter's-box violations. */
export interface PlayViolation {
  type?: string;
  description?: string;
  player?: Person;
}

/** MLB always sends both halves here, but a pitch type can arrive bare. */
export type PitchType = Partial<CodedDescription>;

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
  officials?: LiveGameOfficial[];
  info?: LiveBoxscoreInfoLabel[];
  pitchingNotes?: string[];
  topPerformers?: LiveTopPerformer[];
}

export type LiveBoxscoreTeams = HomeAwayPair<LiveBoxscoreTeam>;

export interface LiveGameOfficial {
  official?: Person;
  officialType?: string;
}

/** `{ label, value }` — one row of the boxscore's free-text notes. */
export interface LiveBoxscoreInfoLabel {
  label?: string;
  value?: string;
}

/** A titled group of `fieldList` rows, e.g. `BATTING` / `FIELDING`. */
export interface LiveBoxscoreInfoGroup {
  title?: string;
  fieldList?: LiveBoxscoreInfoLabel[];
}

export interface LiveBoxscoreTeam {
  team?: MlbTeam;
  teamStats?: LiveBoxscoreTeamStats;
  players?: Record<string, LiveBoxscorePlayer>;
  batters?: number[];
  pitchers?: number[];
  bench?: number[];
  bullpen?: number[];
  battingOrder?: number[];
  info?: LiveBoxscoreInfoGroup[];
  note?: LiveBoxscoreInfoLabel[];
}

/** Team totals use the same three stat groups a player's line does. */
export type LiveBoxscoreTeamStats = StatGroups;

/** This game's line (`stats`) and the season to date (`seasonStats`). */
export type LiveBoxscorePlayerStats = StatGroups;

export interface LiveBoxscorePlayer {
  person?: Person;
  jerseyNumber?: string;
  position?: Position;
  allPositions?: Position[];
  status?: CodedDescription;
  parentTeamId?: number;
  /** A string because MLB encodes the sub slot in it, e.g. `"401"`. */
  battingOrder?: string;
  stats?: LiveBoxscorePlayerStats;
  seasonStats?: LiveBoxscorePlayerStats;
  gameStatus?: LiveBoxscoreGameStatus;
}

export interface LiveBoxscoreGameStatus {
  isCurrentBatter?: boolean;
  isCurrentPitcher?: boolean;
  isOnBench?: boolean;
  isSubstitute?: boolean;
}

/** MLB's own pick of the game's best lines, scored by `gameScore`. */
export interface LiveTopPerformer {
  player?: LiveBoxscorePlayer;
  type?: string;
  gameScore?: number;
  hittingGameScore?: number;
}

export interface LiveDecisions {
  winner?: Person;
  loser?: Person;
  save?: Person;
}

/** Re-exported so consumers can name the referenced entity shape. */
export type LiveMlbRef = MlbRef;

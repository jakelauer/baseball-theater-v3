/**
 * Stat lines. MLB returns the same three groups — batting, pitching, fielding —
 * wherever it reports numbers: boxscore `stats` (this game), `seasonStats`,
 * team totals, and the `stats[]` splits hydrated onto a person.
 *
 * The counting stats a plate appearance produces are identical whether they are
 * credited to the batter or charged to the pitcher, so both lines extend
 * `StatLineCore` rather than repeating it.
 */
import type { MlbLink, MlbRef, Person } from "./common.js";

/** Stats a plate appearance produces, credited to batter and pitcher alike. */
export interface StatLineCore {
  /** Only the season splits from `/people` carry the player's age. */
  age?: number;
  airOuts?: number;
  atBats?: number;
  baseOnBalls?: number;
  catchersInterference?: number;
  caughtStealing?: number;
  caughtStealingPercentage?: string;
  doubles?: number;
  flyOuts?: number;
  gamesPlayed?: number;
  groundIntoDoublePlay?: number;
  groundIntoTriplePlay?: number;
  groundOuts?: number;
  groundOutsToAirouts?: string;
  hitByPitch?: number;
  hits?: number;
  homeRuns?: number;
  intentionalWalks?: number;
  leftOnBase?: number;
  lineOuts?: number;
  pickoffs?: number;
  plateAppearances?: number;
  popOuts?: number;
  rbi?: number;
  runs?: number;
  sacBunts?: number;
  sacFlies?: number;
  stolenBasePercentage?: string;
  stolenBases?: number;
  strikeOuts?: number;
  totalBases?: number;
  triples?: number;
  /** Free text MLB attaches to a boxscore line, e.g. `a-` for a pinch hitter. */
  note?: string;
  /** Pre-formatted line for display, e.g. `2-4 | HR, 2 RBI`. */
  summary?: string;
}

/** Rate stats only the batting group carries. */
export interface BattingStatLine extends StatLineCore {
  avg?: string;
  obp?: string;
  slg?: string;
  ops?: string;
  babip?: string;
  atBatsPerHomeRun?: string;
}

/** Everything charged to a pitcher, including the counts only they accrue. */
export interface PitchingStatLine extends StatLineCore {
  balks?: number;
  balls?: number;
  battersFaced?: number;
  blownSaves?: number;
  completeGames?: number;
  earnedRuns?: number;
  era?: string;
  gamesFinished?: number;
  gamesPitched?: number;
  gamesStarted?: number;
  hitBatsmen?: number;
  hitsPer9Inn?: string;
  holds?: number;
  homeRunsPer9?: string;
  inheritedRunners?: number;
  inheritedRunnersScored?: number;
  inningsPitched?: string;
  losses?: number;
  numberOfPitches?: number;
  obp?: string;
  outs?: number;
  passedBall?: number;
  pitchesPerInning?: string;
  pitchesThrown?: number;
  runsScoredPer9?: string;
  saveOpportunities?: number;
  saves?: number;
  shutouts?: number;
  strikePercentage?: string;
  strikeoutWalkRatio?: string;
  strikeoutsPer9Inn?: string;
  strikes?: number;
  walksPer9Inn?: string;
  whip?: string;
  wildPitches?: number;
  winPercentage?: string;
  wins?: number;
  /** Present on a probable pitcher's season split, not on a game line. */
  avg?: string;
  babip?: string;
  atBatsPerHomeRun?: string;
  slg?: string;
  ops?: string;
}

export interface FieldingStatLine {
  assists?: number;
  caughtStealing?: number;
  caughtStealingPercentage?: string;
  chances?: number;
  errors?: number;
  /** Fielding percentage as a string, e.g. `.987`. */
  fielding?: string;
  gamesStarted?: number;
  passedBall?: number;
  pickoffs?: number;
  putOuts?: number;
  stolenBasePercentage?: string;
  stolenBases?: number;
}

/**
 * A person's `stats[]` split does not say which group it belongs to in its
 * type — `group.displayName` does — so one line has to admit every group.
 */
export type PlayerStatLine = BattingStatLine & PitchingStatLine & FieldingStatLine;

/** The three groups as MLB nests them under `stats` / `seasonStats`. */
export interface StatGroups {
  batting?: BattingStatLine;
  pitching?: PitchingStatLine;
  fielding?: FieldingStatLine;
}

/** `{ displayName }` — how MLB labels a stat group and a stat type. */
export interface StatDisplayName {
  displayName?: string;
}

/** Shared envelope of a hydrated split: which group, which type, exemptions. */
export interface StatSplitEnvelope {
  group?: StatDisplayName;
  type?: StatDisplayName;
  exemptions?: unknown[];
}

/**
 * One entry of the `stats[]` array hydrated onto a person.
 *
 * The live feed puts the line directly on `stats`; `/people?hydrate=stats(...)`
 * instead returns `splits[]`, one row per team/league the player logged the
 * season with. Both spellings come back under the same envelope.
 */
export interface PersonStatSplit extends StatSplitEnvelope {
  stats?: PlayerStatLine;
  splits?: PersonSeasonSplit[];
}

/** One `splits[]` row: the line plus the context it was accumulated in. */
export interface PersonSeasonSplit {
  season?: string;
  gameType?: string;
  /** Present when the split spans more than one team. */
  numTeams?: number;
  team?: MlbRef;
  league?: MlbRef;
  sport?: StatSplitSportRef;
  player?: Person;
  stat?: PlayerStatLine;
}

/**
 * The sport ref inside a split is the one MLB ref that omits `name` and sends
 * `abbreviation` instead, so it cannot reuse `MlbRef` as-is.
 */
export interface StatSplitSportRef extends MlbLink {
  name?: string;
  abbreviation?: string;
}

/** One cell of the batter's hot/cold zone grid. */
export interface HotColdZone {
  zone?: string;
  color?: string;
  temp?: string;
  value?: string;
}

export interface HotColdZoneStat {
  name?: string;
  zones?: HotColdZone[];
}

export interface HotColdZoneSplit {
  stat?: HotColdZoneStat;
}

export interface HotColdZoneStatGroup extends StatSplitEnvelope {
  splits?: HotColdZoneSplit[];
}

export interface HotColdZoneStats {
  stats?: HotColdZoneStatGroup[];
}

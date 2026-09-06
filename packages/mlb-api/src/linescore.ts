/**
 * Linescore shapes. The schedule hydrate and the live feed return the same
 * structure, so both modules reference these types rather than redeclaring.
 */
import type { MlbRef, Person } from "./common.js";

export interface LinescoreInningLine {
  runs?: number;
  hits?: number;
  errors?: number;
  leftOnBase?: number;
}

export interface LinescoreInning {
  num: number;
  ordinalNum: string;
  home?: LinescoreInningLine;
  away?: LinescoreInningLine;
}

export interface LinescoreTeams {
  home?: LinescoreInningLine;
  away?: LinescoreInningLine;
}

/** Who is at bat / on deck / in the hole, plus occupied bases. */
export interface LinescoreOffense {
  batter?: Person;
  onDeck?: Person;
  inHole?: Person;
  first?: Person;
  second?: Person;
  third?: Person;
  team?: MlbRef;
}

export interface LinescoreDefense {
  pitcher?: Person;
  catcher?: Person;
  team?: MlbRef;
}

export interface Linescore {
  currentInning?: number;
  currentInningOrdinal?: string;
  inningState?: string;
  inningHalf?: string;
  isTopInning?: boolean;
  scheduledInnings?: number;
  innings: LinescoreInning[];
  teams?: LinescoreTeams;
  defense?: LinescoreDefense;
  offense?: LinescoreOffense;
  balls?: number;
  strikes?: number;
  outs?: number;
}

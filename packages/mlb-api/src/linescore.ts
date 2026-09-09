/**
 * Linescore shapes. The schedule hydrate and the live feed return the same
 * structure, so both modules reference these types rather than redeclaring.
 */
import type { CountState, HomeAwayPair, MlbTeam, Person } from "./common.js";

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

/** Game totals per side — the same away/home pair every other block uses. */
export type LinescoreTeams = HomeAwayPair<LinescoreInningLine>;

/**
 * Both halves of the current matchup carry the same batter/pitcher pointers —
 * MLB reports them from each side's perspective, so the shared part is factored
 * out and each side adds only the positions it is responsible for.
 */
export interface LinescoreLineup {
  batter?: Person;
  onDeck?: Person;
  inHole?: Person;
  pitcher?: Person;
  battingOrder?: number;
  team?: MlbTeam;
}

/** The batting side: who is up, and who is standing on which base. */
export interface LinescoreOffense extends LinescoreLineup {
  first?: Person;
  second?: Person;
  third?: Person;
}

/** The fielding side: every defensive position that is currently manned. */
export interface LinescoreDefense extends LinescoreLineup {
  catcher?: Person;
  first?: Person;
  second?: Person;
  third?: Person;
  shortstop?: Person;
  left?: Person;
  center?: Person;
  right?: Person;
}

export interface Linescore extends CountState {
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
}

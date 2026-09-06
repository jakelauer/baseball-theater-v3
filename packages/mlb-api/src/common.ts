/**
 * Shared MLB Stats API building blocks.
 *
 * These mirror upstream payload shapes only. BT product types live in
 * `@bt/domain` and must not be re-declared or re-exported from this package.
 */

/** `{ id, name, link }` — the shape MLB returns for most referenced entities. */
export interface MlbRef {
  id: number;
  name: string;
  link?: string;
}

/** Team as embedded in schedule/live payloads. */
export interface MlbTeam extends MlbRef {
  abbreviation?: string;
  teamName?: string;
  clubName?: string;
  shortName?: string;
  locationName?: string;
  franchiseName?: string;
  teamCode?: string;
  fileCode?: string;
  active?: boolean;
  league?: MlbRef;
  division?: MlbRef;
  sport?: MlbRef;
  season?: number;
  record?: TeamRecord;
}

export interface TeamRecord {
  wins?: number;
  losses?: number;
  winningPercentage?: string;
  gamesPlayed?: number;
}

export interface LeagueRecord {
  wins: number;
  losses: number;
  pct: string;
}

/** Game status block — identical in schedule and live feed payloads. */
export interface GameStatus {
  abstractGameState: string;
  codedGameState?: string;
  detailedState: string;
  statusCode?: string;
  abstractGameCode?: string;
  startTimeTBD?: boolean;
}

export interface Venue extends MlbRef {
  active?: boolean;
  season?: string;
  location?: VenueLocation;
  timeZone?: VenueTimeZone;
  fieldInfo?: VenueFieldInfo;
}

export interface VenueLocation {
  city?: string;
  state?: string;
  stateAbbrev?: string;
  country?: string;
  address1?: string;
  postalCode?: string;
}

export interface VenueTimeZone {
  id?: string;
  offset?: number;
  tz?: string;
}

export interface VenueFieldInfo {
  capacity?: number;
  turfType?: string;
  roofType?: string;
  leftLine?: number;
  center?: number;
  rightLine?: number;
}

/**
 * People come back keyed by `fullName`, not the `name` every other MLB ref
 * uses — so this deliberately does not extend `MlbRef`.
 */
export interface Person {
  id: number;
  link?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  boxscoreName?: string;
  primaryNumber?: string;
  primaryPosition?: Position;
}

export interface Position {
  code?: string;
  name?: string;
  type?: string;
  abbreviation?: string;
}

/** `{ code, description }` — used for bat side, pitch hand, call types. */
export interface CodedDescription {
  code: string;
  description: string;
}

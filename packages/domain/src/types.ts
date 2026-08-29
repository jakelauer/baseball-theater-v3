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
    home: { runs: number | null; hits: number | null; errors: number | null };
    away: { runs: number | null; hits: number | null; errors: number | null };
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
  venue: { id: number; name: string } | null;
  linescore: LinescoreSummary | null;
  highlights: MediaHighlight[];
  fetchedAt: string; // ISO
  windowMode: "active" | "cache";
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
};

export type PatronTier =
  "none" | "Backer" | "Pro Backer" | "Star Backer" | "Premium Sponsor";

export type Entitlements = {
  tier: PatronTier;
  fasterLiveRefresh: boolean;
  cloudSyncedSettings: boolean;
  savantLinks: boolean;
};

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  patreonUserId: string | null;
  entitlements: Entitlements;
  favoriteTeamIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type FreshnessMeta = {
  fetchedAt: string;
  windowMode: "active" | "cache";
  stale: boolean;
};

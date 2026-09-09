/**
 * Snapshot → BT store documents. Pure: no I/O, no clock, no upstream types.
 *
 * Ingest owns the fetching; this module owns the shape. Splitting one snapshot
 * into five documents is what lets a live game patch its linescore without
 * rewriting its play list, and lets the box tab load without the play-by-play.
 */
import type { AtBat } from "./plays.js";
import type {
  BoxscoreBattingRow,
  BoxscorePitchingRow,
  BoxscoreTeamTable,
  GameBoxscoreDoc,
  GameDocumentMeta,
  GameHeaderDoc,
  GameLinescoreDoc,
  GameMediaDoc,
  GamePlaysDoc,
  GameProjection,
} from "./store.js";
import type { AbstractTeam, GameSnapshot } from "./types.js";

function metaOf(snapshot: GameSnapshot): GameDocumentMeta {
  return {
    gamePk: snapshot.gamePk,
    fetchedAt: snapshot.fetchedAt,
    windowMode: snapshot.windowMode,
  };
}

export function projectGameHeader(snapshot: GameSnapshot): GameHeaderDoc {
  return {
    ...metaOf(snapshot),
    gameDate: snapshot.gameDate,
    officialDate: snapshot.officialDate,
    status: snapshot.status,
    teams: snapshot.teams,
    venue: snapshot.venue,
  };
}

export function projectGameLinescore(snapshot: GameSnapshot): GameLinescoreDoc {
  return { ...metaOf(snapshot), linescore: snapshot.linescore };
}

export function projectGamePlays(snapshot: GameSnapshot): GamePlaysDoc {
  return {
    ...metaOf(snapshot),
    plays: snapshot.plays,
    playCount: snapshot.plays.length,
  };
}

/**
 * The batting side of a half-inning is the away team on `top`. Until the store
 * carries upstream boxscore lines (S13 widens the client), the tables are
 * derived from the at-bats themselves: one row per batter faced, one per
 * pitcher who threw.
 */
function tableFor(
  team: AbstractTeam,
  plays: AtBat[],
  half: "top" | "bottom",
): BoxscoreTeamTable {
  const batters = new Map<number, BoxscoreBattingRow>();
  const pitchers = new Map<number, BoxscorePitchingRow>();

  for (const play of plays) {
    const { batter, pitcher } = play.matchup;
    if (play.about.halfInning === half) {
      const row = batters.get(batter.id);
      if (row) row.plateAppearances += 1;
      else
        batters.set(batter.id, {
          playerId: batter.id,
          name: batter.fullName,
          plateAppearances: 1,
        });
    } else {
      const row = pitchers.get(pitcher.id);
      if (row) row.battersFaced += 1;
      else
        pitchers.set(pitcher.id, {
          playerId: pitcher.id,
          name: pitcher.fullName,
          battersFaced: 1,
        });
    }
  }

  return {
    teamId: team.id,
    abbreviation: team.abbreviation,
    batting: [...batters.values()],
    pitching: [...pitchers.values()],
  };
}

export function projectGameBoxscore(snapshot: GameSnapshot): GameBoxscoreDoc {
  return {
    ...metaOf(snapshot),
    teams: {
      away: tableFor(snapshot.teams.away, snapshot.plays, "top"),
      home: tableFor(snapshot.teams.home, snapshot.plays, "bottom"),
    },
  };
}

export function projectGameMedia(snapshot: GameSnapshot): GameMediaDoc {
  return { ...metaOf(snapshot), highlights: snapshot.highlights };
}

/** All five documents for one ingested game. */
export function projectGame(snapshot: GameSnapshot): GameProjection {
  return {
    header: projectGameHeader(snapshot),
    linescore: projectGameLinescore(snapshot),
    plays: projectGamePlays(snapshot),
    boxscore: projectGameBoxscore(snapshot),
    media: projectGameMedia(snapshot),
  };
}

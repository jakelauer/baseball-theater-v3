/**
 * Pure upstream → BT mappers for the schedule payload.
 *
 * No I/O here: adapters fetch, mappers translate. Keeping these pure is what
 * lets the recorded `fixtures/raw/` payloads stand in for the network in tests.
 */
import type {
  AbstractTeam,
  GameStatusCode,
  LinescoreSummary,
  ScheduleDay,
  ScheduleGameSummary,
} from "@bt/domain";
import type {
  Linescore,
  MlbTeam,
  GameStatus as UpstreamStatus,
  ScheduleGame,
  ScheduleResponse,
} from "@bt/mlb-api";

/** MLB's `codedGameState` is already the single letter the domain expects. */
export function toStatusCode(coded: string | undefined): GameStatusCode | string {
  return coded ?? "U";
}

export function mapTeam(team: MlbTeam): AbstractTeam {
  return {
    id: team.id,
    abbreviation: team.abbreviation ?? "",
    name: team.name,
    teamName: team.teamName ?? team.clubName ?? team.name,
  };
}

export function mapStatus(status: UpstreamStatus): ScheduleGameSummary["status"] {
  return {
    abstractGameState: status.abstractGameState,
    codedGameState: toStatusCode(status.codedGameState),
    detailedState: status.detailedState,
  };
}

export function mapLinescore(linescore: Linescore | undefined): LinescoreSummary | null {
  if (!linescore) return null;
  return {
    currentInning: linescore.currentInning ?? null,
    inningState: linescore.inningState ?? null,
    isTopInning: linescore.isTopInning ?? null,
    outs: linescore.outs ?? null,
    balls: linescore.balls ?? null,
    strikes: linescore.strikes ?? null,
    teams: {
      home: {
        runs: linescore.teams?.home?.runs ?? null,
        hits: linescore.teams?.home?.hits ?? null,
        errors: linescore.teams?.home?.errors ?? null,
      },
      away: {
        runs: linescore.teams?.away?.runs ?? null,
        hits: linescore.teams?.away?.hits ?? null,
        errors: linescore.teams?.away?.errors ?? null,
      },
    },
  };
}

export function mapScheduleGame(game: ScheduleGame): ScheduleGameSummary {
  return {
    gamePk: game.gamePk,
    gameDate: game.officialDate ?? game.gameDate.slice(0, 10),
    officialDate: game.officialDate ?? game.gameDate.slice(0, 10),
    status: mapStatus(game.status),
    teams: {
      home: mapTeam(game.teams.home.team),
      away: mapTeam(game.teams.away.team),
    },
    venue: game.venue ? { id: game.venue.id, name: game.venue.name } : null,
    linescore: mapLinescore(game.linescore),
  };
}

/** Picks the requested date out of the response; empty day when absent. */
export function mapScheduleResponse(
  response: ScheduleResponse,
  date: string,
  fetchedAt: string,
  windowMode: ScheduleDay["windowMode"] = "cache",
): ScheduleDay {
  const day = response.dates.find((entry) => entry.date === date) ?? response.dates[0];
  return {
    date: day?.date ?? date,
    games: (day?.games ?? []).map(mapScheduleGame),
    fetchedAt,
    windowMode,
  };
}

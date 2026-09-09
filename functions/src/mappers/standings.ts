/**
 * Pure upstream → BT mapper for standings.
 *
 * MLB reports every games-back and elimination figure as a string and uses
 * `"-"` for "not applicable" rather than `0` or `null`. Normalizing that here
 * keeps the sentinel out of the UI entirely.
 */
import type {
  StandingsDivision,
  StandingsSnapshot,
  StandingsTeamRecord,
} from "@bt/domain";
import type {
  StandingsRecordEntry,
  StandingsRecordGroup,
  StandingsResponse,
} from "@bt/mlb-api";

/** MLB's "not applicable" dash, normalized to `null`. */
export function normalizeDash(value: string | undefined): string | null {
  if (value === undefined || value === "-") return null;
  return value;
}

function toRank(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function mapStandingsTeam(entry: StandingsRecordEntry): StandingsTeamRecord {
  return {
    teamId: entry.team?.id ?? 0,
    name: entry.team?.name ?? "",
    abbreviation: entry.team?.abbreviation ?? null,
    wins: entry.wins ?? entry.leagueRecord?.wins ?? 0,
    losses: entry.losses ?? entry.leagueRecord?.losses ?? 0,
    pct: entry.winningPercentage ?? entry.leagueRecord?.pct ?? null,
    gamesBack: normalizeDash(entry.gamesBack),
    divisionRank: toRank(entry.divisionRank),
    streak: entry.streak?.streakCode ?? null,
    runsScored: entry.runsScored ?? null,
    runsAllowed: entry.runsAllowed ?? null,
    runDifferential: entry.runDifferential ?? null,
    divisionLeader: entry.divisionLeader ?? false,
    clinched: entry.clinched ?? false,
    eliminationNumber: normalizeDash(entry.eliminationNumber),
  };
}

export function mapStandingsDivision(group: StandingsRecordGroup): StandingsDivision {
  const rows = group.teamRecords ?? [];
  const teams = rows.map(mapStandingsTeam);
  teams.sort((a, b) => (a.divisionRank ?? Infinity) - (b.divisionRank ?? Infinity));
  // The group's own division ref is unnamed; the readable name is on each row.
  const named = rows.find((row) => row.team?.division?.name);
  return {
    divisionId: group.division?.id ?? null,
    name: named?.team?.division?.name ?? null,
    leagueId: group.league?.id ?? null,
    teams,
  };
}

export function mapStandings(
  response: StandingsResponse,
  date: string,
  fetchedAt = new Date().toISOString(),
): StandingsSnapshot {
  return {
    date,
    divisions: (response.records ?? []).map(mapStandingsDivision),
    fetchedAt,
    windowMode: "cache",
  };
}

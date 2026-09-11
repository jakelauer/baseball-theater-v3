/**
 * Pure upstream → BT mapper for players.
 *
 * `/people?hydrate=stats(...)` returns each season line under
 * `stats[].splits[]` — one row per team the player logged the season with —
 * rather than the single `stats` line the live feed hydrates. Only the season
 * splits are mapped; BT shows a season bag, not a career table.
 */
import type { PlayerProfile, PlayerSeasonLine } from "@bt/domain";
import type {
	PeopleResponse,
	Person,
	PersonSeasonSplit,
	PersonStatSplit,
} from "@bt/mlb-api";

function mapSeasonLine(group: string, split: PersonSeasonSplit): PlayerSeasonLine
{
	const stat = split.stat ?? {};
	return {
		season: split.season ?? "",
		group,
		teamId: split.team?.id ?? null,
		gamesPlayed: stat.gamesPlayed ?? null,
		avg: stat.avg ?? null,
		obp: stat.obp ?? null,
		slg: stat.slg ?? null,
		ops: stat.ops ?? null,
		homeRuns: stat.homeRuns ?? null,
		rbi: stat.rbi ?? null,
		era: stat.era ?? null,
		wins: stat.wins ?? null,
		losses: stat.losses ?? null,
		strikeOuts: stat.strikeOuts ?? null,
		inningsPitched: stat.inningsPitched ?? null,
	};
}

export function mapPlayerSeasons(
	splits: PersonStatSplit[] | undefined,
): PlayerSeasonLine[]
{
	return (splits ?? []).flatMap((entry) =>
	{
		const group = entry.group?.displayName ?? "";
		return (entry.splits ?? []).map((split) => mapSeasonLine(group, split));
	});
}

export function mapPlayer(person: Person): PlayerProfile
{
	return {
		playerId: person.id,
		fullName: person.fullName ?? "",
		boxscoreName: person.boxscoreName ?? null,
		primaryNumber: person.primaryNumber ?? null,
		position: person.primaryPosition?.abbreviation ?? null,
		batSide: person.batSide?.code ?? null,
		pitchHand: person.pitchHand?.code ?? null,
		birthDate: person.birthDate ?? null,
		currentAge: person.currentAge ?? null,
		active: person.active ?? false,
		seasons: mapPlayerSeasons(person.stats),
	};
}

export function mapPeople(response: PeopleResponse): PlayerProfile[]
{
	return (response.people ?? []).map(mapPlayer);
}

import { Group, Text } from "@mantine/core";
import { MLB_TEAMS } from "@bt/domain";
import { TeamSwatch } from "./TeamSwatch.js";

/** A club's abbreviation from `MLB_TEAMS`, or nothing for an unknown id. */
function abbreviation(teamId: number): string
{
	return MLB_TEAMS.find((t) => t.id === teamId)?.abbreviation ?? "";
}

/**
 * "NYY @ BOS" with each team's swatch (S61; search result rows, S5): away then
 * home. Abbreviations are Light text and the swatches carry the team colors
 * through `TeamSwatch` (and so `contrastSafeTeamColor`) — team color is never type.
 */
export function MatchupAbbr({ awayId, homeId }: { awayId: number;
	homeId: number; })
{
	return (
		<Group gap={6} wrap="nowrap" data-testid="matchup-abbr">
			<TeamSwatch teamId={awayId} />
			<Text span size="sm">{abbreviation(awayId)}</Text>
			<Text span size="sm" c="dimmed">@</Text>
			<TeamSwatch teamId={homeId} />
			<Text span size="sm">{abbreviation(homeId)}</Text>
		</Group>
	);
}

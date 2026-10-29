import { Box } from "@mantine/core";
import { contrastSafeTeamColor } from "@bt/domain";

/**
 * A team's 4px edge bar (S61; S31 `Rich Scoreboard Module`, collapsed bar): team
 * color as an edge only, never type (VISUAL-DESIGN §3). It stretches to its row's
 * height, so the parent is a flex row. The color is the contrast-safe value from
 * `packages/domain`; a view never names a hex (VISUAL-DESIGN: "Views receive a team
 * color value").
 */
export function TeamEdge({ teamId }: { teamId: number })
{
	return (
		<Box
			w={4}
			data-testid="team-edge"
			aria-hidden
			style={{
				alignSelf: "stretch",
				flexShrink: 0,
				borderRadius: 2,
				background: contrastSafeTeamColor(teamId),
			}}
		/>
	);
}

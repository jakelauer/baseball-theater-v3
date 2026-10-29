import { Box } from "@mantine/core";
import { contrastSafeTeamColor } from "@bt/domain";

/**
 * A team's color swatch (S61; standings rows, search rows, the Box switcher dot):
 * a small round mark beside the name or abbreviation, which carries the meaning —
 * the swatch is decoration, so it is hidden from assistive tech. Color from
 * `contrastSafeTeamColor`, never a hex in the view.
 */
export function TeamSwatch({ teamId, size = 10 }: { teamId: number;
	size?: number; })
{
	return (
		<Box
			w={size}
			h={size}
			data-testid="team-swatch"
			aria-hidden
			style={{
				flexShrink: 0,
				borderRadius: "50%",
				background: contrastSafeTeamColor(teamId),
			}}
		/>
	);
}

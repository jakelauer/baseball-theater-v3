import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/**
 * The three host pairings (VISUAL-DESIGN §5, D10): views receive one as a
 * `variant` prop and never read the viewport themselves (ADR-014 rule 8; only
 * `web/src/layout/` may). Do not add a fourth.
 */
export type LayoutVariant = "mobile" | "medium" | "desktop";

/**
 * The pairing for the current viewport: mobile below Mantine's `sm`, desktop
 * (medium plus the nav rail) from `lg`, medium between. Provisional until
 * S60's layout host passes `variant` itself; routes call it for now.
 */
export function useLayoutVariant(): LayoutVariant
{
	const { breakpoints } = useMantineTheme();
	const medium = useMediaQuery(`(min-width: ${breakpoints.sm})`);
	const desktop = useMediaQuery(`(min-width: ${breakpoints.lg})`);
	if (desktop) return "desktop";
	return medium ? "medium" : "mobile";
}

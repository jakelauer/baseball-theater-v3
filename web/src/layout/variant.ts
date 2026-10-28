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
 * (medium plus the nav rail) from `lg`, medium between. Only the layout host
 * (`AppShellLayout`) calls it. The first render already reads the viewport (no
 * SSR here), so a desktop load doesn't flash the mobile header.
 */
export function useLayoutVariant(): LayoutVariant
{
	const { breakpoints } = useMantineTheme();
	const immediate = {
		getInitialValueInEffect: false,
	};
	const medium = useMediaQuery(`(min-width: ${breakpoints.sm})`, false, immediate);
	const desktop = useMediaQuery(`(min-width: ${breakpoints.lg})`, false, immediate);
	if (desktop) return "desktop";
	return medium ? "medium" : "mobile";
}

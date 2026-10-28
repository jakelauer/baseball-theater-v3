/** The app's sections, in rail order (S31 `nav-rail`). */
export const NAV = [
	{
		to: "/games",
		label: "Scoreboard",
	},
	{
		to: "/standings",
		label: "Standings",
	},
	{
		to: "/search",
		label: "Search",
	},
	{
		to: "/settings",
		label: "Settings",
		/** Settings are signed-in only (ADR-027), so signed out the item isn't shown (S56 A2). */
		signedInOnly: true,
	},
];

/**
 * The section a path belongs to, by prefix: a game (`/game/:pk`) is opened from
 * the scoreboard, so it lights Scoreboard (S31 `nav-rail` `Active`).
 */
export function activeSection(pathname: string): string | null
{
	if (pathname.startsWith("/game/")) return "/games";
	return NAV.find((item) => pathname.startsWith(item.to))?.to ?? null;
}

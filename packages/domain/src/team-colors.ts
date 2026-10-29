/**
 * Team colors and division names (S61; VISUAL-DESIGN §3 "Team colors").
 *
 * MLB's API carries no team colors, so this is a hand-made table of each club's
 * official primary color (owner, 2026-10-19), keyed by the `MLB_TEAMS` ids (`teams.ts`) — never a
 * second team list (ADR-025). Where a club's primary is black, the table uses its
 * official secondary instead, as VISUAL-DESIGN allows "official (or BT-normalized)"
 * colors: Pittsburgh's gold reads; black on the Dark ground doesn't.
 *
 * Views never paint `teamColor` directly: they take `contrastSafeTeamColor`, the
 * derived value lightened at this data/theme boundary until it reads on Dark — the
 * frames show raw colors, and Padres brown or Yankees navy vanish there (S31 notes).
 * Team color is an edge or swatch only, never type.
 */
/** The page ground every team color must read against (VISUAL-DESIGN palette: Dark). */
export const DARK_GROUND = "#10100F";

/**
 * The least contrast a team edge or swatch needs on Dark: WCAG's 3:1 for graphical
 * objects (S61 AC 2). It is a mark, not text, so 4.5:1 doesn't apply.
 */
export const TEAM_COLOR_MIN_CONTRAST = 3;

/** Official primary colors as `#rrggbb`, by Stats API team id. */
const TEAM_COLORS: Readonly<Record<number, string>> = {
	109: "#a71930", // AZ Sedona red
	144: "#ce1141", // ATL scarlet
	110: "#df4601", // BAL orange
	111: "#bd3039", // BOS red
	112: "#0e3386", // CHC blue
	145: "#27251f", // CWS black
	113: "#c6011f", // CIN red
	114: "#00385d", // CLE navy
	115: "#333366", // COL purple
	116: "#0c2340", // DET navy
	117: "#eb6e1f", // HOU orange
	118: "#004687", // KC royal blue
	108: "#ba0021", // LAA red
	119: "#005a9c", // LAD blue
	146: "#00a3e0", // MIA blue
	158: "#12284b", // MIL navy
	142: "#002b5c", // MIN navy
	121: "#002d72", // NYM blue
	147: "#0c2340", // NYY navy
	133: "#003831", // ATH green
	143: "#e81828", // PHI red
	134: "#fdb827", // PIT gold (primary is black; see above)
	135: "#2f241d", // SD brown
	137: "#fd5a1e", // SF orange
	136: "#0c2c56", // SEA navy
	138: "#c41e3a", // STL red
	139: "#092c5c", // TB navy
	140: "#003278", // TEX blue
	141: "#134a8e", // TOR blue
	120: "#ab0003", // WSH red
};

/** A team's official color, or `undefined` for an id that isn't one of the 30 clubs. */
export function teamColor(teamId: number): string | undefined
{
	return TEAM_COLORS[teamId];
}

function channels(hex: string): [number, number, number]
{
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string
{
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex: string): number
{
	const [r, g, b] = channels(hex).map((c) =>
	{
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colors (1 to 21, order doesn't matter). */
export function contrastRatio(a: string, b: string): number
{
	const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
	return (hi + 0.05) / (lo + 0.05);
}

/** `hex` mixed toward white by `amount` (0 = unchanged, 1 = white). */
function lighten(hex: string, amount: number): string
{
	return toHex(channels(hex).map((c) => Math.round(c + (255 - c) * amount)) as [number, number, number]);
}

/**
 * The team color a view paints: the official color, lightened in 5% steps toward
 * white only as far as it needs to reach `TEAM_COLOR_MIN_CONTRAST` on `DARK_GROUND`,
 * so it stays as close to the club's own color as reads. `undefined` for an unknown id.
 */
export function contrastSafeTeamColor(teamId: number): string | undefined
{
	const raw = teamColor(teamId);
	if (!raw) return undefined;
	// White passes, so this ends by step 20 at the latest.
	let step = 0;
	while (contrastRatio(lighten(raw, step / 20), DARK_GROUND) < TEAM_COLOR_MIN_CONTRAST) step++;
	return lighten(raw, step / 20);
}

/**
 * Division names by Stats API division id. The standings recording carries
 * `name: null` for every division (fixtures/standings-2026-09-05.json), so the six
 * names live here; `undefined` for any other id.
 */
const DIVISION_NAMES: Readonly<Record<number, string>> = {
	200: "AL West",
	201: "AL East",
	202: "AL Central",
	203: "NL West",
	204: "NL East",
	205: "NL Central",
};

/** A division's short name ("AL East"), or `undefined` for an unknown id. */
export function divisionName(divisionId: number): string | undefined
{
	return DIVISION_NAMES[divisionId];
}

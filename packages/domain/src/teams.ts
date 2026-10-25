/**
 * The 30 MLB clubs as the Stats API names them (team `id` and `abbreviation`,
 * checked against the committed fixtures on 2026-10-24: Arizona is `AZ`, the
 * Athletics `ATH`). The one list the Favorite Teams dropdown (S6) and anything
 * else that offers every team reads; team colors (S61) key off the same `id`.
 */
export interface MlbTeam
{
	id: number;
	abbreviation: string;
	/** The club name without its city, as the Stats API's `teamName`. */
	name: string;
}

export const MLB_TEAMS: readonly MlbTeam[] = [
	{
		id: 109,
		abbreviation: "AZ",
		name: "D-backs",
	},
	{
		id: 144,
		abbreviation: "ATL",
		name: "Braves",
	},
	{
		id: 110,
		abbreviation: "BAL",
		name: "Orioles",
	},
	{
		id: 111,
		abbreviation: "BOS",
		name: "Red Sox",
	},
	{
		id: 112,
		abbreviation: "CHC",
		name: "Cubs",
	},
	{
		id: 145,
		abbreviation: "CWS",
		name: "White Sox",
	},
	{
		id: 113,
		abbreviation: "CIN",
		name: "Reds",
	},
	{
		id: 114,
		abbreviation: "CLE",
		name: "Guardians",
	},
	{
		id: 115,
		abbreviation: "COL",
		name: "Rockies",
	},
	{
		id: 116,
		abbreviation: "DET",
		name: "Tigers",
	},
	{
		id: 117,
		abbreviation: "HOU",
		name: "Astros",
	},
	{
		id: 118,
		abbreviation: "KC",
		name: "Royals",
	},
	{
		id: 108,
		abbreviation: "LAA",
		name: "Angels",
	},
	{
		id: 119,
		abbreviation: "LAD",
		name: "Dodgers",
	},
	{
		id: 146,
		abbreviation: "MIA",
		name: "Marlins",
	},
	{
		id: 158,
		abbreviation: "MIL",
		name: "Brewers",
	},
	{
		id: 142,
		abbreviation: "MIN",
		name: "Twins",
	},
	{
		id: 121,
		abbreviation: "NYM",
		name: "Mets",
	},
	{
		id: 147,
		abbreviation: "NYY",
		name: "Yankees",
	},
	{
		id: 133,
		abbreviation: "ATH",
		name: "Athletics",
	},
	{
		id: 143,
		abbreviation: "PHI",
		name: "Phillies",
	},
	{
		id: 134,
		abbreviation: "PIT",
		name: "Pirates",
	},
	{
		id: 135,
		abbreviation: "SD",
		name: "Padres",
	},
	{
		id: 137,
		abbreviation: "SF",
		name: "Giants",
	},
	{
		id: 136,
		abbreviation: "SEA",
		name: "Mariners",
	},
	{
		id: 138,
		abbreviation: "STL",
		name: "Cardinals",
	},
	{
		id: 139,
		abbreviation: "TB",
		name: "Rays",
	},
	{
		id: 140,
		abbreviation: "TEX",
		name: "Rangers",
	},
	{
		id: 141,
		abbreviation: "TOR",
		name: "Blue Jays",
	},
	{
		id: 120,
		abbreviation: "WSH",
		name: "Nationals",
	},
];

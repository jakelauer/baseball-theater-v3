/**
 * Which rooms a game offers, by phase (S32 / S40): pre-game Videos · Plays · Box;
 * in progress adds Live; final adds Recap — never Live and Recap together.
 */
export const ROOMS = ["videos", "live", "plays", "box", "recap"] as const;
export type Room = (typeof ROOMS)[number];

export type GamePhase = "pregame" | "live" | "final";

export const DEFAULT_ROOM: Room = "videos";

/** MLB's `abstractGameState` (`Preview` / `Live` / `Final`) mapped to a BT phase. */
export function gamePhase(abstractGameState: string): GamePhase
{
	switch (abstractGameState)
	{
		case "Live":
			return "live";
		case "Final":
			return "final";
		default:
			return "pregame";
	}
}

export function roomsForPhase(phase: GamePhase): readonly Room[]
{
	switch (phase)
	{
		case "live":
			return ["videos", "live", "plays", "box"];
		case "final":
			return ["videos", "plays", "box", "recap"];
		case "pregame":
			return ["videos", "plays", "box"];
	}
}

/** The room to show for a URL segment: the requested one if this phase offers it, else the default. */
export function resolveRoom(requested: string | undefined, phase: GamePhase): Room
{
	const rooms = roomsForPhase(phase);
	return rooms.find((room) => room === requested) ?? DEFAULT_ROOM;
}

export function roomLabel(room: Room): string
{
	return room[0]!.toUpperCase() + room.slice(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * `2024-07-04` → `Jul 4, 2024`, read straight from the calendar date so no
 * timezone can move it to a neighboring day.
 */
export function formatOfficialDate(officialDate: string): string
{
	const [year, month, day] = officialDate.split("-").map(Number);
	const name = month ? MONTHS[month - 1] : undefined;
	if (!year || !name || !day)
	{
		return officialDate;
	}
	return `${name} ${day}, ${year}`;
}

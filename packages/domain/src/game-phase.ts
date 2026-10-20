import { isFinalStatus, isLiveStatus } from "./window.js";

/**
 * Which rooms a game offers, by phase (S32 / S40): pre-game Videos · Plays · Box;
 * in progress adds Live; final adds Recap — never Live and Recap together.
 */
export const ROOMS = ["videos", "live", "plays", "box", "recap"] as const;
export type Room = (typeof ROOMS)[number];

export type GamePhase = "pregame" | "live" | "final";

export const DEFAULT_ROOM: Room = "videos";

/**
 * MLB's `codedGameState` mapped to a BT phase — the one answer to "is this game
 * live?" (ADR-025). Built on the same status sets the ingest window uses
 * (`isLiveStatus` / `isFinalStatus`), so the room tabs and the poller can never
 * disagree: pre-game warm-up (`P`) and delays (`D`) count as live, and a
 * cancelled game (`C`) counts as final. Unknown codes are pre-game.
 */
export function gamePhase(codedGameState: string): GamePhase
{
	if (isLiveStatus(codedGameState)) return "live";
	if (isFinalStatus(codedGameState)) return "final";
	return "pregame";
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

import { isFinalStatus, isLiveStatus } from "./window.js";

/**
 * Which rooms a game offers, by phase (S32 / S40): pre-game Videos · Plays · Box;
 * in progress adds Live; final adds Recap — never Live and Recap together. Recap
 * only when MLB has published one (VISUAL-DESIGN §5 "when available"; S10).
 */
export const ROOMS = ["videos", "live", "plays", "box", "recap"] as const;
export type Room = (typeof ROOMS)[number];

export type GamePhase = "pregame" | "live" | "final";

export const DEFAULT_ROOM: Room = "videos";

/**
 * MLB's `codedGameState` mapped to a BT phase — the one answer to "is this game
 * live?" (ADR-025). Built on the same status sets the ingest window uses
 * (`isLiveStatus` / `isFinalStatus`), so the room tabs and the poller can never
 * disagree. Only an in-progress game (`I`) is live: warm-up (`P`) and delays
 * (`D`) show no Live room (owner, 2026-10-19), and a cancelled game (`C`)
 * counts as final. Unknown codes are pre-game. Ingest keeps polling delays
 * separately (`isGameInActiveWindow`).
 */
export function gamePhase(codedGameState: string): GamePhase
{
	if (isLiveStatus(codedGameState)) return "live";
	if (isFinalStatus(codedGameState)) return "final";
	return "pregame";
}

/** The rooms to show as tabs. `hasRecap`: whether the game carries a recap (S10). */
export function roomsForPhase(phase: GamePhase, hasRecap: boolean): readonly Room[]
{
	switch (phase)
	{
		case "live":
			return ["videos", "live", "plays", "box"];
		case "final":
			return hasRecap ? ["videos", "plays", "box", "recap"] : ["videos", "plays", "box"];
		case "pregame":
			return ["videos", "plays", "box"];
	}
}

/** The room to show for a URL segment: the requested one if this phase offers it, else the default. */
export function resolveRoom(requested: string | undefined, phase: GamePhase, hasRecap: boolean): Room
{
	const rooms = roomsForPhase(phase, hasRecap);
	return rooms.find((room) => room === requested) ?? DEFAULT_ROOM;
}

/**
 * The room a game opens on. A room in the URL wins (as {@link resolveRoom}); with
 * none, the user's Opens First setting when this game offers it (Live on a
 * final game doesn't exist, nor Recap without a recap), else the default room. Signed out, callers pass
 * the house default.
 */
export function openingRoom(requested: string | undefined, opensFirst: Room, phase: GamePhase, hasRecap: boolean): Room
{
	if (requested !== undefined) return resolveRoom(requested, phase, hasRecap);
	return resolveRoom(opensFirst, phase, hasRecap);
}

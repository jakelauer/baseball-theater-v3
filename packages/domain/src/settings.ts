import type { Room } from "./game-phase.js";
import { MLB_TEAMS } from "./teams.js";

/** The rooms a user may pick to open first (the ratified Settings frame's Opens First: Videos / Live / Box). */
export const OPENS_FIRST_ROOMS = ["videos", "live", "box"] as const satisfies readonly Room[];

export type OpensFirst = (typeof OPENS_FIRST_ROOMS)[number];

/**
 * A user's settings, stored on their account (ADR-027) and synced to every
 * device. Versioned like every BT document (ADR-022): a write applies only if
 * its `version` is newer than the stored one, so a stale device can't undo a
 * newer change. Controls that land later (game-row slot S67, collapse and Hide
 * Scores S68, Video Player S70) add their fields with their reader.
 */
export type AccountSettings = {
	/** MLB team ids (`MLB_TEAMS`), in the order the user picked them. */
	favoriteTeamIds: number[];
	opensFirst: OpensFirst;
	version: number;
};

/** The house defaults: what a signed-out visitor gets, and a new account until it saves. */
export const DEFAULT_SETTINGS: AccountSettings = {
	favoriteTeamIds: [],
	opensFirst: "videos",
	version: 0,
};

const TEAM_IDS = new Set(MLB_TEAMS.map((t) => t.id));

/**
 * `value` as settings when it is a well-formed document (every field present,
 * known team ids without repeats, an offered room, a whole non-negative
 * version), else null. The server uses it on every write, so nothing malformed
 * is stored.
 */
export function parseAccountSettings(value: unknown): AccountSettings | null
{
	if (value === null || typeof value !== "object") return null;
	const {
		favoriteTeamIds, opensFirst, version,
	} = value as Record<string, unknown>;
	if (!Array.isArray(favoriteTeamIds) || !favoriteTeamIds.every((id) => typeof id === "number" && TEAM_IDS.has(id))) return null;
	if (new Set(favoriteTeamIds).size !== favoriteTeamIds.length) return null;
	if (!OPENS_FIRST_ROOMS.some((room) => room === opensFirst)) return null;
	if (typeof version !== "number" || !Number.isInteger(version) || version < 0) return null;
	return {
		favoriteTeamIds: favoriteTeamIds as number[],
		opensFirst: opensFirst as OpensFirst,
		version,
	};
}

import { contentHash } from "./content-hash.js";

/** Anything the live path ships as a whole state stamped with a per-game version (ADR-022). */
export type Versioned = {
	/** Monotonic per game: a higher number is always the newer state. */
	version: number;
};

/**
 * The ADR-022 apply-if-newer rule: keep whichever of the two states has the
 * higher version, so a duplicated or late update can never roll a game back.
 *
 * Every layer that holds a game state (Postgres conditional write, hub, client
 * cache) applies this same rule. It assumes updates are whole states, not
 * commands — applying "the game at version N" twice is harmless. A tie keeps
 * `current`, so re-delivering the version already held changes nothing.
 * `current` is null before the first update has been applied.
 */
export function applyIfNewer<T extends Versioned>(current: T | null, incoming: T): T
{
	if (current === null) return incoming;
	return incoming.version > current.version ? incoming : current;
}

/** The ADR-022 stamp BT puts on a stored state; upstream payloads arrive without it. */
export type VersionStamp = Versioned & {
	/** ISO time the content last changed. */
	lastChangedAt: string;
};

/** A state as fetched, before BT stamps it — what `MlbStatsClient` returns. */
export type Unversioned<T> = Omit<T, keyof VersionStamp>;

/** What counts as content: everything except the stamp and the poll time. */
function contentOf(value: object): unknown
{
	const {
		version: _v, lastChangedAt: _l, fetchedAt: _f, ...content
	} = value as Record<string, unknown>;
	return content;
}

/**
 * Stamps a freshly fetched state against the stored one (ADR-022): a new state
 * starts at version 1; a state whose content hash matches the stored one keeps
 * the stored version and `lastChangedAt`, so an unchanged poll is not a new
 * version; any other change is the stored version + 1, changed at `now`.
 * `fetchedAt` (the poll time) is left out of the hash, so polling alone never
 * bumps. Other fields, including `windowMode`, are content: a game leaving its
 * active window changes how readers cache it.
 */
export function stampVersion<T extends VersionStamp>(stored: T | null, incoming: Unversioned<T>, now: string): T
{
	if (stored && contentHash(contentOf(stored)) === contentHash(contentOf(incoming)))
	{
		return {
			...incoming,
			version: stored.version,
			lastChangedAt: stored.lastChangedAt,
		} as T;
	}
	return {
		...incoming,
		version: stored ? stored.version + 1 : 1,
		lastChangedAt: now,
	} as T;
}

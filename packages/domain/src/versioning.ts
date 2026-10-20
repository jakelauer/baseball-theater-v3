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

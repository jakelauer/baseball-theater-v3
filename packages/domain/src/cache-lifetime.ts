const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Shortest cache lifetime: what a game or schedule that just changed gets.
 * Equals the fixed 5-minute TTL the refresh path used before ADR-021.
 */
export const CACHE_LIFETIME_FLOOR_MS = 5 * MINUTE;

/** Longest cache lifetime — the staleness guarantee for late MLB scoring corrections (ADR-021). */
export const CACHE_LIFETIME_CAP_MS = 48 * HOUR;

/** One rung: once data has gone unchanged for `unchangedForMs`, cache it for `lifetimeMs`. */
export type CacheLifetimeStep = {
	unchangedForMs: number;
	lifetimeMs: number;
};

/**
 * The ADR-021 ladder, ascending. Below the first rung the floor applies; the
 * last rung is the cap. Tunable — change the numbers here, never at a call site.
 */
export const CACHE_LIFETIME_LADDER: readonly CacheLifetimeStep[] = [
	{
		unchangedForMs: 10 * MINUTE,
		lifetimeMs: 15 * MINUTE,
	},
	{
		unchangedForMs: 15 * MINUTE,
		lifetimeMs: 30 * MINUTE,
	},
	{
		unchangedForMs: 30 * MINUTE,
		lifetimeMs: 2 * HOUR,
	},
	{
		unchangedForMs: 2 * HOUR,
		lifetimeMs: 10 * HOUR,
	},
	{
		unchangedForMs: 10 * HOUR,
		lifetimeMs: 24 * HOUR,
	},
	{
		unchangedForMs: 24 * HOUR,
		lifetimeMs: CACHE_LIFETIME_CAP_MS,
	},
];

/**
 * How long data may be cached, given how long it has gone unchanged
 * (`now − lastChangedAt`). The one implementation of ADR-021: the edge
 * `s-maxage` and the MLB refresh-on-read both call it.
 *
 * A detected change resets `lastChangedAt`, so the input drops to ~0 and the
 * lifetime falls back to the floor. A negative or non-finite input (clock skew,
 * missing timestamp) also gets the floor: the safe answer is "check again soon".
 */
export function cacheLifetimeMs(msSinceLastChange: number): number
{
	let lifetime = CACHE_LIFETIME_FLOOR_MS;
	if (!Number.isFinite(msSinceLastChange)) return lifetime;
	for (const step of CACHE_LIFETIME_LADDER)
	{
		if (msSinceLastChange < step.unchangedForMs) break;
		lifetime = step.lifetimeMs;
	}
	return lifetime;
}

/**
 * How fresh a cached payload is expected to be (ADR-014: freshness is declared by
 * the server, not guessed per call site).
 *
 * BT tells the client what it is holding via `windowMode` on every payload:
 * `active` means the ingest loop is pulling this resource on a cadence, so the
 * client re-asks while it is on screen; `cache` means the server itself is not
 * refreshing, so polling would only add load without adding news.
 *
 * This is the **only** module in `web/` allowed to name an interval. A resource
 * that wants different timing states the reason here rather than sprinkling a
 * number into its descriptor.
 */

/** What a payload declares about the server's own refresh behaviour. */
export type WindowMode = "active" | "cache";

export interface Freshness
{
	/** How long a cached payload is served without a background re-fetch. */
	staleTime: number;
	/** Background re-fetch cadence while a reader is mounted, or `false` for none. */
	refetchInterval: number | false;
}

const SECOND = 1000;

/** In-window: the ingest cadence is writing; follow it closely enough to feel live. */
const ACTIVE: Freshness = {
	staleTime: 10 * SECOND,
	refetchInterval: 15 * SECOND,
};

/** Out-of-window: the server is not refreshing, so re-asking cannot produce news. */
const CACHED: Freshness = {
	staleTime: 5 * 60 * SECOND,
	refetchInterval: false,
};

/** Nothing loaded yet — treat as cached; the first successful payload settles it. */
export function freshnessPolicy(windowMode: WindowMode | undefined): Freshness
{
	return windowMode === "active" ? ACTIVE : CACHED;
}

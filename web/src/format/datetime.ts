/**
 * How the app writes a moment the server sends (ISO 8601), in the reader's own
 * time zone. Formatting only — every date BT shows is computed server-side or in
 * `packages/domain` (ADR-025); nothing here adds or compares times. Shared by
 * every screen that shows a date (S79 first; the scoreboard stories reuse it).
 */

const DATE = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

const TIME = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
});

/** "Nov 11, 2026" (standings-search-settings A4). */
export function formatDate(iso: string): string
{
	return DATE.format(new Date(iso));
}

/** "3:15 PM" (A4's download refusal). */
export function formatTime(iso: string): string
{
	return TIME.format(new Date(iso));
}

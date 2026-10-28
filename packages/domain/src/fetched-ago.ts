/**
 * How long ago BT fetched a payload, as the shell footer says it
 * ("Fetched 12s ago · baseball.theater", S31 `footer-meta`; S60). One
 * implementation (ADR-025): the footer and A1's offline line ("saved 18m ago")
 * both format this value and never subtract times themselves.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * `fetchedAt` (ISO) relative to `now`, in the largest whole unit: `12s ago`,
 * `1m ago`, `2h ago`, `3d ago`. A fetch stamped after `now` (client clock
 * behind the server's) reads `0s ago` rather than a negative age.
 */
export function fetchedAgo(fetchedAt: string, now: Date): string
{
	const seconds = Math.max(0, Math.floor((now.getTime() - Date.parse(fetchedAt)) / 1000));
	if (seconds < MINUTE) return `${seconds}s ago`;
	if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
	if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
	return `${Math.floor(seconds / DAY)}d ago`;
}

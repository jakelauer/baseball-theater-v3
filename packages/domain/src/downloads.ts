/**
 * The rules for a user's data download (ADR-028, owner 2026-10-27): a download
 * is a stored file that ages out after 14 days, and a user may request one at
 * most twice in any rolling 24 hours. One implementation (ADR-025): the server
 * applies these and answers with the resulting times, so Settings (S79) only
 * formats them and never recomputes.
 */
const HOUR = 60 * 60 * 1000;

/** How long a download stays fetchable (the R2 bucket's lifecycle rule in production). */
export const DOWNLOAD_LIFETIME_DAYS = 14;

/** How many downloads a user may request inside {@link DOWNLOAD_WINDOW_MS}. */
export const DOWNLOADS_PER_WINDOW = 2;

/** The rolling window the request limit counts over. */
export const DOWNLOAD_WINDOW_MS = 24 * HOUR;

/** ISO time a download made at `createdAt` stops being fetchable. */
export function downloadExpiresAt(createdAt: Date): string
{
	return new Date(createdAt.getTime() + DOWNLOAD_LIFETIME_DAYS * 24 * HOUR).toISOString();
}

/** Whether a download expiring at `expiresAt` (ISO) has aged out by `now`. The expiry instant itself counts as gone. */
export function downloadExpired(expiresAt: string, now: Date): boolean
{
	return Date.parse(expiresAt) <= now.getTime();
}

/**
 * When the user may next request a download, given the ISO times of their
 * earlier requests: null when they may request one now. A request counts while
 * it is less than 24 hours old, so with two inside the window the next is
 * allowed exactly 24 hours after the earlier of them. Times in any order.
 */
export function nextDownloadAllowedAt(requestTimes: readonly string[], now: Date): string | null
{
	const recent = requestTimes
		.map((t) => Date.parse(t))
		.filter((t) => now.getTime() - t < DOWNLOAD_WINDOW_MS)
		.sort((a, b) => a - b);
	if (recent.length < DOWNLOADS_PER_WINDOW) return null;
	// The oldest request that must leave the window before the count drops below the limit.
	const blocking = recent[recent.length - DOWNLOADS_PER_WINDOW]!;
	return new Date(blocking + DOWNLOAD_WINDOW_MS).toISOString();
}

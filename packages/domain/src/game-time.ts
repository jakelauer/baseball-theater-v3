/**
 * A game's start time as the viewer reads it (S65): their own time zone, with its
 * label — `4:10 PM EDT` (owner, 2026-10-19: start times in the viewer's zone, labeled).
 * The one formatter for the scoreboard and anywhere else a first pitch is shown.
 */
export function formatGameTime(iso: string, timeZone: string): string
{
	return new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone,
		timeZoneName: "short",
	}).format(new Date(iso));
}

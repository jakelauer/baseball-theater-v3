import type { Room } from "@bt/domain";

/** `live` → `Live`: the tab label for a room. The rooms themselves come from `@bt/domain` (ADR-025). */
export function roomLabel(room: Room): string
{
	return room[0]!.toUpperCase() + room.slice(1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * `2024-07-04` → `Jul 4, 2024`, read straight from the calendar date so no
 * timezone can move it to a neighboring day.
 */
export function formatOfficialDate(officialDate: string): string
{
	const [year, month, day] = officialDate.split("-").map(Number);
	const name = month ? MONTHS[month - 1] : undefined;
	if (!year || !name || !day)
	{
		return officialDate;
	}
	return `${name} ${day}, ${year}`;
}

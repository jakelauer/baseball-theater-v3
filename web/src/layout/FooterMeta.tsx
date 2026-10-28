import { Text } from "@mantine/core";
import { fetchedAgo } from "@bt/domain";

/**
 * The quiet line at the foot of a page (S31 `footer-meta`): "Fetched 12s ago ·
 * baseball.theater", the age from `fetchedAgo` (one implementation, ADR-025).
 * A page with no BT payload yet (the stubs) shows the site name alone. It never
 * says scores are hidden (owner, 2026-10-21: "remove that from the footer").
 *
 * The age updates whenever the page re-renders — an active payload refetches
 * every 15 s (`api/freshness.ts`), so no separate clock is needed.
 */
export function FooterMeta({ fetchedAt, now = new Date() }: {
	fetchedAt?: string;
	now?: Date;
})
{
	return (
		<Text component="footer" size="xs" ta="center" py="lg" c="dimmed">
			{fetchedAt ? `Fetched ${fetchedAgo(fetchedAt, now)} · baseball.theater` : "baseball.theater"}
		</Text>
	);
}

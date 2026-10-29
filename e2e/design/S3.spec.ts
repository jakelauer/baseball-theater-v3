/**
 * S3's design match (rule 22): the Live room's compact status in the pairing of each
 * game-rooms Live frame — `live-mobile` (the status row under the tabs) and
 * `live-medium` / `live-desktop` (the status card at the top of the right-hand
 * column) — on the 745001 fixture (NYY @ BOS, In Progress, Top 6th, 1 out, 2–1).
 *
 * Judge only the status (owner, 2026-10-28: "Judge only the story's own parts").
 * Expected differences, built later: the base diamond with runners, the pitcher and
 * batter cards, the zone and trajectory, the pitch sequence and the win-probability
 * chart (the Live pitch theater body, S64), and the "Live data subscription" footer
 * link. The frames' sample state (Bot 7th, 2–2, NYY 4 · BOS 2) differs from the
 * fixture's; the top bar and tabs are S40's, the footer's "Fetched … ago" the real time.
 */
import { test } from "@playwright/test";
import { capture, hideDevControls } from "./helpers.js";

for (const frame of ["live-mobile", "live-medium", "live-desktop"])
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await page.goto("/game/745001/live");
		await page.getByRole("status", {
			name: "Live status",
		}).waitFor();
		await page.evaluate(async () =>
		{
			await document.fonts.ready;
		});
		await hideDevControls(page);
		await capture(page, testInfo, frame);
	});
}

/**
 * S10's design match (rule 22): the Recap room in the pairing of each game-rooms
 * Recap frame — `recap-mobile`, `recap-medium`, `recap-desktop` — and A2's
 * `recap-source-mobile` (the document ending in "Source: MLB"), on the 823823 fixture
 * (MLB's recorded recap of CHC @ MIA). The two mobile frames are one state: the
 * full-page capture runs to the source line.
 *
 * Expected differences, not judged (owner, 2026-10-28: "Judge only the story's own
 * parts"): the frames' sample article (NYY @ BOS, four short paragraphs) versus MLB's
 * real, much longer one, so the page is far taller; the desktop frame's "Generated
 * recap" (A2 replaced the line with "Source: MLB"); the top bar and tabs (S40); the
 * footer's "Fetched … ago" (the real time); on desktop the rail's border stops at the
 * first screen's height in a full-page capture of a long page (the layout host's, S60).
 */
import { test } from "@playwright/test";
import { capture, hideDevControls } from "./helpers.js";

for (const frame of ["recap-mobile", "recap-medium", "recap-desktop", "recap-source-mobile"])
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await page.goto("/game/823823/recap");
		await page.getByText("Source: MLB").waitFor();
		await page.evaluate(async () =>
		{
			await document.fonts.ready;
		});
		await hideDevControls(page);
		await capture(page, testInfo, frame);
	});
}

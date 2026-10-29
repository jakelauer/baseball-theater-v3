/**
 * S2's design match (rule 22): the Box room in the state and pairing of each
 * game-rooms frame it builds — `box-mobile`, `box-medium`, `box-desktop` on the
 * 823823 fixture (CHC @ MIA, Final 6–5), and `room-empty-mobile` on a game with no
 * box score (744834).
 *
 * Expected differences, not judged (owner, 2026-10-28: "Judge only the story's own
 * parts"): the frames' sample game (NYY @ BOS, Sep 21, 2026, 5–3) versus the fixture
 * game, so names, numbers, the date and how many batters there are differ; the
 * footer's "Fetched … ago" (the dev API stamps the fetch with the real time); the
 * rail's version line (S60/S83); and Game info lines MLB didn't send.
 *
 * Flagged for the owner, not S2's own parts: on `room-empty-mobile` the frame centres
 * the sentence and pins the footer to the bottom; the shared `ViewState` (S60) puts it
 * at the top and the footer sits under the content (owner, 2026-10-28: "Under the
 * content"). The top bar and room tabs are S40's.
 */
import { test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { capture, hideDevControls } from "./helpers.js";

async function box(page: Page, gamePk: number, ready: string): Promise<void>
{
	await page.goto(`/game/${gamePk}/box`);
	await page.getByText(ready).first().waitFor();
	await page.evaluate(async () =>
	{
		await document.fonts.ready;
	});
	await hideDevControls(page);
}

const FRAMES: { frame: string;
	run: (page: Page) => Promise<void>; }[] = [
	{
		frame: "box-mobile",
		run: (page) => box(page, 823823, "GAME INFO"),
	},
	{
		frame: "box-medium",
		run: (page) => box(page, 823823, "GAME INFO"),
	},
	{
		frame: "box-desktop",
		run: (page) => box(page, 823823, "GAME INFO"),
	},
	{
		frame: "room-empty-mobile",
		run: (page) => box(page, 744834, "No box score yet."),
	},
];

for (const { frame, run } of FRAMES)
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await run(page);
		await capture(page, testInfo, frame);
	});
}

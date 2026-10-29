/**
 * S64's design match (rule 22): the Live pitch theater in the pairing of each game-rooms
 * Live frame — `live-mobile`, `live-medium`, `live-desktop`. `pnpm dev` has no live game
 * with runners and plays (745001 has `live: null` and no plays), so the game route is
 * answered with `fixtures/game-823823-live.json`, the mid-game moment S63 folded from
 * MLB's recording: top 3rd, two out, bases loaded, Bregman batting against Gusto.
 *
 * Judge only S64's parts (owner, 2026-10-28: "Judge only the story's own parts"): the
 * base diamond, the pitcher and batter cards, the matchup line, the zone and trajectory,
 * and the pitch sequence. Expected differences: no win-probability chart (left out at
 * launch, owner 2026-10-19); no headshots; the zone and trajectory are the existing
 * pitch components (S52), not the frames' batter illustration; the frames' sample game
 * (NYY @ BOS, Bot 7th) is not the fixture's (CHC @ MIA, Top 3rd); the top bar, tabs and
 * status are S40's and S3's; the footer's "Fetched … ago" is the real time.
 */
import { readFileSync } from "node:fs";
import { test } from "@playwright/test";
import {
	capture, hideDevControls, stubApi,
} from "./helpers.js";

const LIVE = JSON.parse(readFileSync(new URL("../../fixtures/game-823823-live.json", import.meta.url), "utf8"));

for (const frame of ["live-mobile", "live-medium", "live-desktop"])
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await stubApi(page, "/api/v1/games/823823", 200, {
			...LIVE,
			fetchedAt: new Date().toISOString(),
			windowMode: "active",
			version: 1,
			lastChangedAt: "2026-09-05T20:57:20.000Z",
		});
		await page.goto("/game/823823/live");
		await page.getByTestId("matchup-cards").waitFor();
		await page.evaluate(async () =>
		{
			await document.fonts.ready;
		});
		await hideDevControls(page);
		await capture(page, testInfo, frame);
	});
}

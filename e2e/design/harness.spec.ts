/**
 * The capture helpers themselves (S81 AC 2): a stubbed API answer reaches a
 * state the dev app can't, and the frozen clock holds. Captures nothing.
 */
import { expect, test } from "@playwright/test";
import { freezeClock, stubApi } from "./helpers.js";

test("stubApi reaches the scoreboard's error state; freezeClock holds the time", async ({ page }, testInfo) =>
{
	test.skip(testInfo.project.name !== "mobile", "one pairing is enough to prove the helpers");
	await freezeClock(page, "2024-07-04T23:00:00.000Z");
	await stubApi(page, "/api/v1/schedule*", 503, {
		error: "unavailable",
	});
	await page.goto("/games/2024-07-04");
	await expect(page.getByRole("alert")).toContainText("Couldn't load games");
	expect(await page.evaluate(() => new Date().toISOString())).toBe("2024-07-04T23:00:00.000Z");
});

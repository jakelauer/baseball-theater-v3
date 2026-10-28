/**
 * Each project really renders its pairing (S81 AC 1): the layout host shows the
 * burger and no rail on mobile and medium, the rail and no burger on desktop.
 */
import { expect, test } from "@playwright/test";

test("renders the project's pairing", async ({ page }, testInfo) =>
{
	await page.goto("/games/2024-07-04");
	const burger = page.getByRole("button", {
		name: "Open navigation",
	});
	const rail = page.getByRole("navigation", {
		name: "Main",
	});
	if (testInfo.project.name === "desktop")
	{
		await expect(rail).toBeVisible();
		await expect(burger).toHaveCount(0);
	}
	else
	{
		await expect(burger).toBeVisible();
		await expect(rail).toHaveCount(0);
	}
});

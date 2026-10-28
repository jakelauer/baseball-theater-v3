/**
 * S60's shell, compared after the fact (S81 AC 7; owner, 2026-10-28: "Compare
 * S60's shell now"). Judged on the shell only — header, rail, drawer, footer;
 * the scoreboard content is an expected difference (S65–S68 rebuild it).
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
	capture, freezeClock, hideDevControls, signInDev,
} from "./helpers.js";

const SCOREBOARD = "/games/2024-07-04";

async function openDrawer(page: Page): Promise<void>
{
	await page.getByRole("button", {
		name: "Open navigation",
	}).click();
	// The drawer slides in; capture once its links sit fully on screen.
	await expect(page.getByRole("dialog").getByRole("link", {
		name: "Scoreboard",
	})).toBeInViewport({
		ratio: 1,
	});
	await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

const FRAMES: {
	frame: string;
	signedIn: boolean;
	drawer: boolean;
}[] = [
	{
		frame: "nav-drawer-mobile",
		signedIn: true,
		drawer: true,
	},
	{
		frame: "nav-drawer-medium",
		signedIn: true,
		drawer: true,
	},
	{
		frame: "shell-signed-out-mobile",
		signedIn: false,
		drawer: true,
	},
	{
		frame: "shell-signed-out-desktop",
		signedIn: false,
		drawer: false,
	},
	{
		frame: "shell-version-desktop",
		signedIn: true,
		drawer: false,
	},
	{
		frame: "scoreboard-header-version-desktop",
		signedIn: true,
		drawer: false,
	},
];

for (const {
	frame, signedIn, drawer,
} of FRAMES)
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await freezeClock(page);
		if (signedIn)
		{
			await signInDev(page, SCOREBOARD);
		}
		else
		{
			await page.goto(SCOREBOARD);
			await page.getByRole("button", {
				name: "Sign in",
			}).first().waitFor();
		}
		// The footer line marks a loaded page (inside <main>, so no contentinfo role in a real browser).
		await page.getByText(/baseball\.theater$/).waitFor();
		if (drawer) await openDrawer(page);
		await hideDevControls(page);
		await capture(page, testInfo, frame);
	});
}

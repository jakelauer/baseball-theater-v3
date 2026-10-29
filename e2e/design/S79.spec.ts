/**
 * S79's design match (rule 22): Settings' download and delete, in the state and
 * pairing of each standings-search-settings A4 frame. States the dev app can't
 * reach on its own (a stored download, the 24-hour refusal, a stale sign-in, a
 * failed deletion, a finished one) come from stubbed API answers.
 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
	capture, freezeClock, hideDevControls, signInDev, stubApi,
} from "./helpers.js";

const DOWNLOAD = {
	id: "dl-1",
	expiresAt: "2024-07-18T16:00:00.000Z",
};
const PHRASE = "delete my account";

async function settings(page: Page, current: typeof DOWNLOAD | null): Promise<void>
{
	await freezeClock(page);
	await stubApi(page, "/api/v1/me/download", current ? 200 : 404, current ?? {
		error: "not_found",
	}, "GET");
	await signInDev(page);
	await page.goto("/settings");
	await page.getByRole("button", {
		name: "Delete account",
	}).waitFor();
}

async function settled(page: Page): Promise<void>
{
	// With the clock frozen, transitions (the dialog's entrance) don't advance on their own:
	// jump each finite one to its end. A looping animation (a spinner) is left alone.
	await page.evaluate(() =>
	{
		for (const a of document.getAnimations()) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
	});
	await page.evaluate(async () =>
	{
		await document.fonts.ready;
	});
	await hideDevControls(page);
}

async function openDelete(page: Page, phrase = ""): Promise<void>
{
	await page.getByRole("button", {
		name: "Delete account",
	}).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	// The dialog fades in: capture once it and every box around it is fully opaque.
	await dialog.evaluate((el) => new Promise<void>((resolve) =>
	{
		const opaque = (): boolean =>
		{
			for (let n: Element | null = el; n; n = n.parentElement) if (getComputedStyle(n).opacity !== "1") return false;
			return true;
		};
		const tick = (): void => void (opaque() ? resolve() : setTimeout(tick, 50));
		tick();
	}));
	if (phrase) await dialog.getByLabel("Confirmation phrase").fill(phrase);
}

async function submitDelete(page: Page): Promise<void>
{
	await page.getByRole("dialog").getByRole("button", {
		name: "Delete account",
	}).click();
}

/**
 * After a deletion (A5): the delete succeeds, and the server's deletion cookie
 * (S87) makes the next signed-out /me answer account_deleted — stubbed here, since
 * the delete itself is.
 */
async function deleted(page: Page): Promise<void>
{
	await stubApi(page, "/api/v1/me/delete", 200, {
		deleted: true,
	}, "POST");
	await page.route("**/api/v1/me", (route) =>
	{
		if (route.request().headers().authorization) return route.fallback();
		return route.fulfill({
			status: 401,
			contentType: "application/json",
			body: JSON.stringify({
				error: "account_deleted",
			}),
		});
	});
	await settings(page, null);
	await openDelete(page, PHRASE);
	await submitDelete(page);
	await page.getByText("Your account and your data are deleted.").waitFor();
}

const FRAMES: { frame: string;
	run: (page: Page) => Promise<void>; }[] = [
	{
		frame: "settings-data-mobile",
		run: (page) => settings(page, null),
	},
	{
		frame: "settings-data-desktop",
		run: (page) => settings(page, null),
	},
	{
		frame: "settings-download-ready-mobile",
		run: (page) => settings(page, DOWNLOAD),
	},
	{
		frame: "settings-download-limit-mobile",
		run: async (page) =>
		{
			await stubApi(page, "/api/v1/me/download", 429, {
				error: "download_limit",
				nextAllowedAt: "2024-07-04T19:15:00.000Z",
			}, "POST");
			await settings(page, DOWNLOAD);
			await page.getByRole("button", {
				name: "Request a new download",
			}).click();
			await page.getByText(/You've requested two downloads/).waitFor();
		},
	},
	{
		frame: "settings-delete-confirm-mobile",
		run: async (page) =>
		{
			await settings(page, null);
			await openDelete(page);
		},
	},
	{
		frame: "settings-delete-confirm-desktop",
		run: async (page) =>
		{
			await settings(page, null);
			await openDelete(page);
		},
	},
	{
		frame: "settings-delete-warning-mobile",
		run: async (page) =>
		{
			await settings(page, DOWNLOAD);
			await openDelete(page, PHRASE);
		},
	},
	{
		frame: "settings-delete-reauth-mobile",
		run: async (page) =>
		{
			await stubApi(page, "/api/v1/me/delete", 403, {
				error: "reauth_required",
			}, "POST");
			await settings(page, null);
			await openDelete(page, PHRASE);
			await submitDelete(page);
			await page.getByText("Sign in again to delete").waitFor();
		},
	},
	{
		frame: "settings-delete-failed-mobile",
		run: async (page) =>
		{
			await stubApi(page, "/api/v1/me/delete", 500, {
				error: "unavailable",
			}, "POST");
			await settings(page, null);
			await openDelete(page, PHRASE);
			await submitDelete(page);
			await page.getByText("Couldn't finish deleting your account").waitFor();
		},
	},
	{
		frame: "settings-deleted-mobile",
		run: (page) => deleted(page),
	},
	{
		frame: "settings-deleted-desktop",
		run: (page) => deleted(page),
	},
];

for (const { frame, run } of FRAMES)
{
	test(frame, async ({ page }, testInfo) =>
	{
		test.skip(!frame.endsWith(`-${testInfo.project.name}`), `${frame} is drawn at another pairing`);
		await run(page);
		await settled(page);
		await capture(page, testInfo, frame);
	});
}

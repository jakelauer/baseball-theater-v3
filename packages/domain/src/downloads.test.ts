import {
	describe, expect, it,
} from "vitest";
import {
	DOWNLOAD_LIFETIME_DAYS, downloadExpired, downloadExpiresAt, nextDownloadAllowedAt,
} from "./downloads.js";

const HOUR = 60 * 60 * 1000;
const t0 = new Date("2026-10-27T12:00:00.000Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("downloadExpiresAt / downloadExpired", () =>
{
	it("ages a download out 14 days after it was made, the expiry instant included", () =>
	{
		expect(DOWNLOAD_LIFETIME_DAYS).toBe(14);
		const expiresAt = downloadExpiresAt(t0);
		expect(expiresAt).toBe("2026-11-10T12:00:00.000Z");
		expect(downloadExpired(expiresAt, at(14 * 24 * HOUR - 1))).toBe(false);
		expect(downloadExpired(expiresAt, at(14 * 24 * HOUR))).toBe(true);
	});
});

describe("nextDownloadAllowedAt", () =>
{
	it("allows a request with fewer than two in the last 24 hours", () =>
	{
		expect(nextDownloadAllowedAt([], t0)).toBeNull();
		expect(nextDownloadAllowedAt([t0.toISOString()], at(HOUR))).toBeNull();
	});

	it("refuses a third inside rolling 24 hours until 24 hours after the earlier of the two", () =>
	{
		const times = [at(2 * HOUR).toISOString(), t0.toISOString()];
		expect(nextDownloadAllowedAt(times, at(3 * HOUR))).toBe(at(24 * HOUR).toISOString());
		expect(nextDownloadAllowedAt(times, at(24 * HOUR - 1))).toBe(at(24 * HOUR).toISOString());
		expect(nextDownloadAllowedAt(times, at(24 * HOUR))).toBeNull();
	});

	it("counts only the window: older requests never block", () =>
	{
		const times = [t0, at(HOUR), at(30 * HOUR), at(31 * HOUR)].map((d) => d.toISOString());
		// At 32h only the 30h and 31h requests count; the next is allowed at 30h + 24h.
		expect(nextDownloadAllowedAt(times, at(32 * HOUR))).toBe(at(54 * HOUR).toISOString());
	});
});

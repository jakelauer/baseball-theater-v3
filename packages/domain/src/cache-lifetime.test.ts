import {
	describe, expect, it,
} from "vitest";
import {
	CACHE_LIFETIME_CAP_MS, CACHE_LIFETIME_FLOOR_MS, CACHE_LIFETIME_LADDER, cacheLifetimeMs,
} from "./cache-lifetime.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe("cacheLifetimeMs", () =>
{
	it("gives the 5-minute floor to data that just changed", () =>
	{
		expect(CACHE_LIFETIME_FLOOR_MS).toBe(5 * MINUTE);
		expect(cacheLifetimeMs(0)).toBe(5 * MINUTE);
	});

	// [unchanged for, expected lifetime] — just below and at every boundary.
	const cases: [number, number][] = [
		[10 * MINUTE - 1, 5 * MINUTE],
		[10 * MINUTE, 15 * MINUTE],
		[15 * MINUTE - 1, 15 * MINUTE],
		[15 * MINUTE, 30 * MINUTE],
		[30 * MINUTE - 1, 30 * MINUTE],
		[30 * MINUTE, 2 * HOUR],
		[2 * HOUR - 1, 2 * HOUR],
		[2 * HOUR, 10 * HOUR],
		[10 * HOUR - 1, 10 * HOUR],
		[10 * HOUR, 24 * HOUR],
		[24 * HOUR - 1, 24 * HOUR],
		[24 * HOUR, 48 * HOUR],
		[48 * HOUR, 48 * HOUR],
	];

	it.each(cases)("unchanged for %i ms → %i ms", (unchanged, lifetime) =>
	{
		expect(cacheLifetimeMs(unchanged)).toBe(lifetime);
	});

	it("caps at 48h for a value far beyond 48h", () =>
	{
		expect(CACHE_LIFETIME_CAP_MS).toBe(48 * HOUR);
		expect(cacheLifetimeMs(365 * 24 * HOUR)).toBe(CACHE_LIFETIME_CAP_MS);
	});

	it("falls back to the floor after a change resets lastChangedAt", () =>
	{
		expect(cacheLifetimeMs(30 * HOUR)).toBe(48 * HOUR);
		expect(cacheLifetimeMs(0)).toBe(CACHE_LIFETIME_FLOOR_MS);
	});

	it("gives the floor to negative or non-finite input", () =>
	{
		expect(cacheLifetimeMs(-1)).toBe(CACHE_LIFETIME_FLOOR_MS);
		expect(cacheLifetimeMs(Number.NaN)).toBe(CACHE_LIFETIME_FLOOR_MS);
	});

	it("keeps the ladder ascending and never shortening", () =>
	{
		for (let i = 1; i < CACHE_LIFETIME_LADDER.length; i++)
		{
			expect(CACHE_LIFETIME_LADDER[i]!.unchangedForMs).toBeGreaterThan(CACHE_LIFETIME_LADDER[i - 1]!.unchangedForMs);
			expect(CACHE_LIFETIME_LADDER[i]!.lifetimeMs).toBeGreaterThanOrEqual(CACHE_LIFETIME_LADDER[i - 1]!.lifetimeMs);
		}
	});
});

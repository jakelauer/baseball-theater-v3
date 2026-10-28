import {
	describe, expect, it,
} from "vitest";
import { fetchedAgo } from "./fetched-ago.js";

const fetchedAt = "2026-10-28T12:00:00.000Z";
const after = (seconds: number) => new Date(Date.parse(fetchedAt) + seconds * 1000);

describe("fetchedAgo", () =>
{
	it("counts seconds under a minute: 0 and 59", () =>
	{
		expect(fetchedAgo(fetchedAt, after(0))).toBe("0s ago");
		expect(fetchedAgo(fetchedAt, after(59))).toBe("59s ago");
	});

	it("switches to whole minutes past a minute: 61", () =>
	{
		expect(fetchedAgo(fetchedAt, after(61))).toBe("1m ago");
		expect(fetchedAgo(fetchedAt, after(18 * 60))).toBe("18m ago");
	});

	it("switches to whole hours, then days: 2h", () =>
	{
		expect(fetchedAgo(fetchedAt, after(2 * 60 * 60))).toBe("2h ago");
		expect(fetchedAgo(fetchedAt, after(3 * 24 * 60 * 60))).toBe("3d ago");
	});

	it("reads a fetch stamped in the future as 0s ago", () =>
	{
		expect(fetchedAgo(fetchedAt, after(-5))).toBe("0s ago");
	});
});

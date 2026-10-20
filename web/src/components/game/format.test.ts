import {
	describe, expect, it,
} from "vitest";
import { formatOfficialDate, roomLabel } from "./format.js";

describe("roomLabel", () =>
{
	it("capitalizes the room for its tab", () =>
	{
		expect(roomLabel("videos")).toBe("Videos");
		expect(roomLabel("recap")).toBe("Recap");
	});
});

describe("formatOfficialDate", () =>
{
	it("formats the calendar date without timezone drift", () =>
	{
		expect(formatOfficialDate("2024-07-04")).toBe("Jul 4, 2024");
		expect(formatOfficialDate("2026-09-21")).toBe("Sep 21, 2026");
	});

	it("passes through anything that is not a date", () =>
	{
		expect(formatOfficialDate("TBD")).toBe("TBD");
		expect(formatOfficialDate("2024-13-01")).toBe("2024-13-01");
	});
});

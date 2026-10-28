import {
	describe, expect, it,
} from "vitest";
import { formatDate, formatTime } from "./datetime.js";

describe("datetime formatting (S79)", () =>
{
	it("writes a date as A4 does", () =>
	{
		expect(formatDate("2026-11-11T12:00:00.000Z")).toMatch(/^Nov 1[01], 2026$/);
	});

	it("writes a time with hours and minutes, AM/PM", () =>
	{
		expect(formatTime("2026-10-28T15:15:00.000Z")).toMatch(/^\d{1,2}:15\s?[AP]M$/);
	});
});

import {
	describe, expect, it,
} from "vitest";
import { formatGameTime } from "./game-time.js";

describe("formatGameTime (S65)", () =>
{
	it("formatGameTime: shows first pitch in the viewer's zone, labeled", () =>
	{
		// CHC @ MIA, 2026-09-05: first pitch 20:10 UTC.
		expect(formatGameTime("2026-09-05T20:10:00Z", "America/New_York")).toBe("4:10 PM EDT");
		expect(formatGameTime("2026-09-05T20:10:00Z", "America/Los_Angeles")).toBe("1:10 PM PDT");
	});

	it("formatGameTime: a zone past midnight shows its own clock", () =>
	{
		expect(formatGameTime("2026-09-05T23:40:00Z", "UTC")).toBe("11:40 PM UTC");
	});
});

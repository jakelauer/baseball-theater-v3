import {
	describe, expect, it,
} from "vitest";
import {
	entitlementsForTier, hasMinimumTier, parsePatronTier,
} from "./entitlements.js";

describe("entitlements", () =>
{
	it("parses tier titles", () =>
	{
		expect(parsePatronTier("Pro Backer")).toBe("Pro Backer");
		expect(parsePatronTier("pro backer plus")).toBe("Pro Backer");
		expect(parsePatronTier(null)).toBe("none");
	});

	it("maps tier to capabilities", () =>
	{
		expect(entitlementsForTier("none").savantLinks).toBe(false);
		expect(entitlementsForTier("Backer").fasterLiveRefresh).toBe(true);
		expect(entitlementsForTier("Backer").savantLinks).toBe(false);
		expect(entitlementsForTier("Pro Backer").savantLinks).toBe(true);
	});

	it("compares minimum tiers", () =>
	{
		expect(hasMinimumTier("Star Backer", "Pro Backer")).toBe(true);
		expect(hasMinimumTier("Backer", "Pro Backer")).toBe(false);
	});
});

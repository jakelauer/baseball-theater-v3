/**
 * S61: every club has a color, every color a view paints reads on Dark, and the six
 * divisions have names. Contrast is computed here from the WCAG formula, not taken
 * from `contrastRatio`, so the test checks the module rather than repeating it.
 */
import { readFileSync } from "node:fs";
import {
	describe, expect, it,
} from "vitest";
import {
	contrastRatio, contrastSafeTeamColor, DARK_GROUND, divisionName, teamColor,
} from "./team-colors.js";
import { MLB_TEAMS } from "./teams.js";

const HEX = /^#[0-9a-f]{6}$/;

/** WCAG 2 contrast, written out independently of the module. */
function wcagContrast(a: string, b: string): number
{
	const lum = (hex: string): number =>
	{
		const n = Number.parseInt(hex.slice(1), 16);
		const lin = (c: number): number => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
		return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
	};
	const [x, y] = [lum(a), lum(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("teamColor (S61)", () =>
{
	it("teamColor: all 30 MLB_TEAMS ids have a #rrggbb color", () =>
	{
		expect(MLB_TEAMS).toHaveLength(30);
		for (const team of MLB_TEAMS) expect(teamColor(team.id), team.abbreviation).toMatch(HEX);
	});

	it("teamColor: an id that isn't a club has none", () =>
	{
		expect(teamColor(1)).toBeUndefined();
	});
});

describe("contrastSafeTeamColor (S61)", () =>
{
	it("contrast: every team's color is at least 3:1 against #10100F", () =>
	{
		expect(DARK_GROUND).toBe("#10100F");
		for (const team of MLB_TEAMS)
		{
			const color = contrastSafeTeamColor(team.id)!;
			expect(color, team.abbreviation).toMatch(HEX);
			expect(wcagContrast(color, "#10100F"), `${team.abbreviation} ${color}`).toBeGreaterThanOrEqual(3);
		}
	});

	it("contrast: a color that already reads is left as it is; a dark one is lightened", () =>
	{
		expect(contrastSafeTeamColor(134)).toBe(teamColor(134)); // Pirates gold
		const navy = contrastSafeTeamColor(147)!; // Yankees navy
		expect(navy).not.toBe(teamColor(147));
		expect(wcagContrast(teamColor(147)!, "#10100F")).toBeLessThan(3);
	});

	it("contrast: contrastRatio agrees with the WCAG formula and ignores order", () =>
	{
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
		expect(contrastRatio("#0c2340", DARK_GROUND)).toBeCloseTo(wcagContrast("#0c2340", "#10100F"), 10);
		expect(contrastRatio(DARK_GROUND, "#fdb827")).toBeCloseTo(contrastRatio("#fdb827", DARK_GROUND), 10);
	});

	it("contrast: an id that isn't a club has none", () =>
	{
		expect(contrastSafeTeamColor(1)).toBeUndefined();
	});
});

describe("divisionName (S61)", () =>
{
	it("divisionName: maps the six divisions in the standings recording", () =>
	{
		const recording = JSON.parse(readFileSync(new URL("../../../fixtures/standings-2026-09-05.json", import.meta.url), "utf8")) as {
			divisions: { divisionId: number }[];
		};
		const names = recording.divisions.map((d) => divisionName(d.divisionId));
		expect(names).toHaveLength(6);
		expect(new Set(names)).toEqual(new Set(["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"]));
		expect(divisionName(201)).toBe("AL East");
	});

	it("divisionName: an unknown id has none", () =>
	{
		expect(divisionName(999)).toBeUndefined();
	});
});

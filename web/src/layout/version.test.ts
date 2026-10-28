import {
	describe, expect, it,
} from "vitest";
import { VERSION_LINE, versionLine } from "./version.js";

describe("versionLine (S60, S56 A2)", () =>
{
	it("prints v3.0.{run number} ({7-char commit}) with no label", () =>
	{
		expect(versionLine("482", "c46e8531f0a2b9d7e6c5")).toBe("v3.0.482 (c46e853)");
	});

	it("prints dev for a build outside GitHub Actions", () =>
	{
		expect(versionLine("dev", "c46e853")).toBe("v3.0.dev (c46e853)");
	});

	it("falls back to dev when nothing was injected (tests skip vite.config.ts)", () =>
	{
		expect(VERSION_LINE).toBe("v3.0.dev (unknown)");
	});
});

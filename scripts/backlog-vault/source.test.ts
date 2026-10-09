import {
	describe, expect, it,
} from "vitest";
import {
	featureNames, pillarNames, sourceKind, sourceProblems,
} from "./source.ts";

const FEATURES = [
	"## Scope legend",
	"",
	"| Tag | Meaning |",
	"|-----|---------|",
	"| **MVP** | Ships first |",
	"",
	"## Carry / cut from v2 (working table)",
	"",
	"| v2 capability | Verdict | Notes |",
	"|---------------|---------|-------|",
	"| Daily scoreboard by date | **Carry** | BT-backed |",
	"| Settings (favorites, hide scores, playback prefs) | **Carry** | |",
	"| Team pages (highlights + schedule) | **Drop** | |",
	"| PWA / installability | **Drop (MVP)** | |",
	"",
	"## New product themes",
	"",
	"| Theme | One-line idea |",
	"|-------|---------------|",
	"| **Impact curation** | Rank what matters |",
	"",
	"#### Push notifications (Later)",
	"",
	"#### Multi-source knowledge (G2, G4)",
	"",
	"## Success signals",
	"",
	"| Signal | Goals |",
	"|--------|-------|",
	"| Infra / hosting cost vs v2 EB | G1 |",
	"",
].join("\n");

const INTENT = [
	"## Goals",
	"",
	"- **Lower run cost** — not a pillar.",
	"",
	"## Pillars",
	"",
	"- **Dependable** — Fans can count on it.",
	"- **Cost-conscious** — Every recurring cost has to earn its place.",
	"",
	"## Document set",
].join("\n");

const docs = {
	features: FEATURES,
	intent: INTENT,
};

const check = (source: string | null, status = "todo") => sourceProblems([{
	id: "S9",
	status,
	source,
}], docs);

describe("featureNames", () =>
{
	it("reads table rows and #### headings from the feature sections only, splitting off dropped rows", () =>
	{
		const { live, dropped } = featureNames(FEATURES);
		expect([...live].sort()).toEqual([
			"Daily scoreboard by date",
			"Impact curation",
			"Multi-source knowledge",
			"Push notifications",
			"Settings (favorites, hide scores, playback prefs)",
		]);
		expect([...dropped].sort()).toEqual(["PWA / installability", "Team pages (highlights + schedule)"]);
	});
});

describe("pillarNames", () =>
{
	it("reads only the Pillars section's bullets", () =>
	{
		expect([...pillarNames(INTENT)]).toEqual(["Dependable", "Cost-conscious"]);
	});
});

describe("sourceKind", () =>
{
	it("names the kind from the line's prefix", () =>
	{
		expect(sourceKind("Feature: Standings")).toBe("feature");
		expect(sourceKind("Pillar: Dependable — x")).toBe("pillar");
		expect(sourceKind("Open: why? Raised 2026-10-09.")).toBe("open");
		expect(sourceKind("Because")).toBeNull();
		expect(sourceKind(null)).toBeNull();
	});
});

describe("sourceProblems (rule 19)", () =>
{
	it("accepts features FEATURES.md describes, including names with commas", () =>
	{
		expect(check("Feature: Daily scoreboard by date; Settings (favorites, hide scores, playback prefs)")).toEqual([]);
		expect(check("Feature: Impact curation; Push notifications")).toEqual([]);
	});

	it("refuses a missing line, an unknown form, an unknown feature, a dropped one, or none at all", () =>
	{
		expect(check(null)).toEqual([expect.stringMatching(/S9 has no \*\*Source:\*\* line/)]);
		expect(check("Because it's good")).toEqual([expect.stringMatching(/must start with Feature:, Pillar:, or Open:/)]);
		expect(check("Feature: MVP")).toEqual([expect.stringMatching(/"MVP", which is not a feature/)]);
		expect(check("Feature: Team pages (highlights + schedule)")).toEqual([expect.stringMatching(/which FEATURES.md drops/)]);
		expect(check("Feature: ")).toEqual([expect.stringMatching(/names no feature/)]);
	});

	it("accepts a pillar only with the owner's dated approval in their words, and only a real pillar", () =>
	{
		expect(check("Pillar: Dependable — a slow MLB call blanks the scoreboard today. Approved by owner 2026-10-09: \"yes, that's reliability\"")).toEqual([]);
		expect(check("Pillar: Dependable — a slow MLB call blanks the scoreboard today.")).toEqual([expect.stringMatching(/without the owner's approval/)]);
		expect(check("Pillar: Dependable — why. Approved by owner 2026-10-09: \"\"")).toEqual([expect.stringMatching(/without the owner's approval/)]);
		expect(check("Pillar: Lower run cost — why. Approved by owner 2026-10-09: \"ok\"")).toEqual([expect.stringMatching(/"Lower run cost", which is not a pillar/)]);
	});

	it("accepts an open question with the date raised, but not on a story that has started", () =>
	{
		expect(check("Open: no feature fits — should we do this? Raised 2026-10-09.")).toEqual([]);
		expect(check("Open: no feature fits — should we do this? Raised 2026-10-09.", "done")).toEqual([]);
		expect(check("Open: should we do this?")).toEqual([expect.stringMatching(/must end "Raised YYYY-MM-DD\."/)]);
		expect(check("Open: should we? Raised 2026-10-09.", "doing")).toEqual([expect.stringMatching(/S9 is `doing` but why it exists is still an open question/)]);
	});
});

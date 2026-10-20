import {
	describe, expect, it,
} from "vitest";
import { exportedSymbols, staleComments } from "./comments-stale.js";

const before = `/** Runs scored by the home team. */
export function homeRuns(game: { home: number }): number
{
	return game.home;
}

/** Total runs. */
export const total = (a: number, b: number) => a + b;
`;

describe("comments:stale", () =>
{
	it("flags an exported function whose body changed while its comment did not", () =>
	{
		const after = before.replace("return game.home;", "return game.home + 1;");
		expect(staleComments(before, after, "a.ts")).toEqual(["homeRuns"]);
	});

	it("does not flag unchanged code", () =>
	{
		expect(staleComments(before, before, "a.ts")).toEqual([]);
	});

	it("does not flag a change that also updated the comment", () =>
	{
		const after = before
			.replace("return game.home;", "return game.home + 1;")
			.replace("Runs scored by the home team.", "Home runs plus one (test).");
		expect(staleComments(before, after, "a.ts")).toEqual([]);
	});

	it("reads exported consts and their comments", () =>
	{
		const symbols = exportedSymbols(before, "a.ts");
		expect([...symbols.keys()]).toEqual(["homeRuns", "total"]);
		expect(symbols.get("total")?.comment).toBe("/** Total runs. */");
	});
});

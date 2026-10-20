import {
	describe, expect, it,
} from "vitest";
import { contentHash } from "./content-hash.js";

const game = {
	gamePk: 745804,
	status: {
		code: "F",
		detail: "Final",
	},
	linescore: {
		innings: [{
			num: 1,
			away: 0,
			home: 2,
		}],
		away: {
			runs: 3,
		},
		home: {
			runs: 4,
		},
	},
	tags: ["walk-off", "extra-innings"],
};

describe("contentHash", () =>
{
	it("is deterministic: the same value hashes the same every time", () =>
	{
		expect(contentHash(game)).toBe(contentHash(game));
		expect(contentHash(game)).toMatch(/^[0-9a-f]{16}$/);
	});

	it("ignores key order, at every depth", () =>
	{
		const reordered = {
			tags: ["walk-off", "extra-innings"],
			linescore: {
				home: {
					runs: 4,
				},
				away: {
					runs: 3,
				},
				innings: [{
					home: 2,
					away: 0,
					num: 1,
				}],
			},
			status: {
				detail: "Final",
				code: "F",
			},
			gamePk: 745804,
		};
		expect(contentHash(reordered)).toBe(contentHash(game));
	});

	it("changes when one nested field changes", () =>
	{
		const corrected = structuredClone(game);
		corrected.linescore.innings[0]!.home = 3;
		expect(contentHash(corrected)).not.toBe(contentHash(game));
	});

	it("keeps array order significant", () =>
	{
		expect(contentHash({
			tags: ["a", "b"],
		})).not.toBe(contentHash({
			tags: ["b", "a"],
		}));
	});

	it("follows JSON semantics for undefined, toJSON and non-finite numbers", () =>
	{
		expect(contentHash({
			a: 1,
			b: undefined,
		})).toBe(contentHash({
			a: 1,
		}));
		expect(contentHash([undefined])).toBe(contentHash([null]));
		expect(contentHash({
			at: new Date(0),
		})).toBe(contentHash({
			at: "1970-01-01T00:00:00.000Z",
		}));
		expect(contentHash(Number.NaN)).toBe(contentHash(null));
		expect(contentHash(undefined)).toBe(contentHash(null));
	});

	it("tells apart values whose loose string forms match", () =>
	{
		expect(contentHash("1")).not.toBe(contentHash(1));
		expect(contentHash({})).not.toBe(contentHash([]));
	});
});

import {
	describe, expect, it,
} from "vitest";
import { applyIfNewer, stampVersion } from "./versioning.js";

type State = {
	version: number;
	label: string;
};

const SEQUENCE: State[] = [
	{
		version: 1,
		label: "first pitch",
	},
	{
		version: 2,
		label: "single",
	},
	{
		version: 3,
		label: "home run",
	},
	{
		version: 4,
		label: "strikeout",
	},
	{
		version: 5,
		label: "final",
	},
];

/** Fold updates in arrival order, the way every consumer applies them. */
function fold(updates: State[]): State | null
{
	return updates.reduce<State | null>((held, next) => applyIfNewer(held, next), null);
}

describe("applyIfNewer", () =>
{
	it("takes the incoming state when nothing is held yet (current is null)", () =>
	{
		const first = SEQUENCE[0]!;
		expect(applyIfNewer(null, first)).toBe(first);
	});

	it("takes a strictly newer version and keeps the held one otherwise", () =>
	{
		const [v1, v2] = SEQUENCE as [State, State];
		expect(applyIfNewer(v1, v2)).toBe(v2);
		expect(applyIfNewer(v2, v1)).toBe(v2);
	});

	it("keeps the held state on a tie, so re-delivery changes nothing", () =>
	{
		const held = {
			version: 3,
			label: "held",
		};
		const resent = {
			version: 3,
			label: "resent",
		};
		expect(applyIfNewer(held, resent)).toBe(held);
	});

	it("ends on the highest version when every update is duplicated", () =>
	{
		const duplicated = SEQUENCE.flatMap((s) => [s, s]);
		expect(fold(duplicated)).toEqual(SEQUENCE[4]);
	});

	// Index orders into SEQUENCE, each a different arrival shuffle.
	const shuffles: number[][] = [
		[4, 3, 2, 1, 0],
		[2, 0, 4, 1, 3],
		[1, 3, 0, 4, 2],
		[3, 4, 0, 2, 1],
	];

	it.each(shuffles)("ends on the highest version for shuffled order %j, duplicated", (...order: number[]) =>
	{
		const shuffled = order.map((i) => SEQUENCE[i]!);
		expect(fold([...shuffled, ...[...shuffled].reverse()])).toEqual(SEQUENCE[4]);
	});
});

describe("stampVersion", () =>
{
	type Doc = { id: number;
		score: number;
		fetchedAt: string;
		version: number;
		lastChangedAt: string; };

	const stored: Doc = {
		id: 1,
		score: 2,
		fetchedAt: "2024-07-04T18:00:00.000Z",
		version: 4,
		lastChangedAt: "2024-07-04T17:00:00.000Z",
	};

	it("starts a new state at version 1, changed now", () =>
	{
		expect(stampVersion<Doc>(null, {
			id: 1,
			score: 0,
			fetchedAt: "t0",
		}, "t0")).toEqual({
			id: 1,
			score: 0,
			fetchedAt: "t0",
			version: 1,
			lastChangedAt: "t0",
		});
	});

	it("keeps the version and lastChangedAt when only the poll time differs", () =>
	{
		const polled = stampVersion<Doc>(stored, {
			id: 1,
			score: 2,
			fetchedAt: "2024-07-04T18:05:00.000Z",
		}, "2024-07-04T18:05:00.000Z");
		expect(polled.version).toBe(4);
		expect(polled.lastChangedAt).toBe(stored.lastChangedAt);
	});

	it("bumps the version and lastChangedAt when the content changes", () =>
	{
		const changed = stampVersion<Doc>(stored, {
			id: 1,
			score: 3,
			fetchedAt: "2024-07-04T18:05:00.000Z",
		}, "2024-07-04T18:05:00.000Z");
		expect(changed.version).toBe(5);
		expect(changed.lastChangedAt).toBe("2024-07-04T18:05:00.000Z");
	});
});

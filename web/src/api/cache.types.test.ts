import type { QueryClient } from "@tanstack/react-query";
import {
	describe, expect, it,
} from "vitest";
import { gameQueryOptions } from "./game.js";
import { scheduleQueryOptions } from "./schedule.js";

describe("typed cache — compile-time binding", () =>
{
	it("descriptors expose the key the type-level check below writes through", () =>
	{
		expect(gameQueryOptions(744834).queryKey).toEqual(["game", 744834]);
		expect(scheduleQueryOptions("2024-07-04").queryKey).toEqual(["schedule", "2024-07-04"]);
	});
});

/**
 * Never called — tsc checks a function body whether or not it runs (the pattern
 * `client.types.test.ts` uses for the fetch helper). Each `@ts-expect-error`
 * below fails the build if the write it marks ever becomes legal, which is what
 * proves the key is bound to its payload type rather than to `unknown`.
 */
function assertCacheWritesAreTyped(client: QueryClient): void
{
	const notAGame = {
		nope: true,
	};
	// @ts-expect-error — a game key cannot hold an arbitrary object.
	client.setQueryData(gameQueryOptions(744834).queryKey, notAGame);

	const aScheduleDay = {
		date: "2024-07-04",
		windowMode: "cache" as const,
		fetchedAt: "2024-07-04T00:00:00.000Z",
		games: [],
	};
	// @ts-expect-error — a schedule day is not a game payload.
	client.setQueryData(gameQueryOptions(744834).queryKey, aScheduleDay);

	// The same day is legal on its own key, so the failures above are about the
	// payload type, not about setQueryData being hard to call.
	client.setQueryData(scheduleQueryOptions(aScheduleDay.date).queryKey, aScheduleDay);
}
void assertCacheWritesAreTyped;

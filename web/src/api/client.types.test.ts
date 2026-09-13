import type { ScheduleDayResponse } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import { fetchGame, fetchSchedule } from "./client.js";

describe("typed API client — compile-time binding", () =>
{
	it("fetchSchedule and fetchGame are exported for the type-level check below", () =>
	{
		expect(typeof fetchSchedule).toBe("function");
		expect(typeof fetchGame).toBe("function");
	});
});

/**
 * Never called — tsc type-checks a function body whether or not it runs (see
 * functions/src/handlers/api.types.test.ts for the same pattern server-side).
 * The real proof is `pnpm --filter @bt/web exec tsc --noEmit` (S26 check 9).
 */
async function assertDerivedTypeIsEnforced(): Promise<void>
{
	// @ts-expect-error — fetchGame's resolved type cannot satisfy ScheduleDayResponse.
	const wrongType: ScheduleDayResponse = await fetchGame(744834);
	void wrongType;
}
void assertDerivedTypeIsEnforced;

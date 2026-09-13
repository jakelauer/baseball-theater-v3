import type { ServerResponse } from "node:http";
import type { GameSnapshotResponse } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import { sendJson } from "./api.js";

describe("API route contract — compile-time binding", () =>
{
	it("sendJson is exported for the type-level checks below", () =>
	{
		expect(typeof sendJson).toBe("function");
	});
});

/**
 * Never called — tsc type-checks a function body whether or not it runs, and
 * this file is transformed (types stripped, not checked) when vitest imports
 * it. The real proof is `pnpm --filter @bt/functions exec tsc --noEmit`
 * (S26 check 6): if the `@ts-expect-error` below were wrong — i.e. the send
 * were actually well-typed — that unused directive fails the typecheck.
 */
function assertRouteBindingIsReal(res: ServerResponse, game: GameSnapshotResponse): void
{
	// @ts-expect-error — a GameSnapshotResponse cannot satisfy the schedule route's ScheduleDayResponse.
	sendJson(res, 200, "GET /api/v1/schedule", game);

	sendJson(res, 200, "GET /api/v1/games/:gamePk", game);
}
void assertRouteBindingIsReal;

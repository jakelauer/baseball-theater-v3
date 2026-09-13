import {
	describe, expect, it,
} from "vitest";
import {
	ApiRoutes, type ApiResponseFor, type GameSnapshotResponse, type ScheduleDayResponse,
} from "./api-routes.js";
import type { GameSnapshot, ScheduleDay } from "./types.js";

describe("ApiRoutes", () =>
{
	it("is a runtime-enumerable table covering the schedule and game routes", () =>
	{
		expect(Object.keys(ApiRoutes)).toEqual([
			"GET /api/v1/schedule",
			"GET /api/v1/games/:gamePk",
		]);
		expect(ApiRoutes["GET /api/v1/schedule"]).toBe("ScheduleDayResponse");
		expect(ApiRoutes["GET /api/v1/games/:gamePk"]).toBe("GameSnapshotResponse");
	});
});

/**
 * Never called — tsc type-checks a function body whether or not it runs (this
 * file is transformed, not type-checked, when vitest imports it; the real
 * proof is `pnpm --filter @bt/domain exec tsc --noEmit`).
 *
 * Proves each response alias is mutually assignable with its domain type
 * today: if a mapping function ever makes them diverge, one of these four
 * assignments starts failing to typecheck — which is exactly the point.
 */
function assertResponseAliasesStayInSync(
	schedule: ScheduleDay,
	scheduleResponse: ScheduleDayResponse,
	game: GameSnapshot,
	gameResponse: GameSnapshotResponse,
): void
{
	const a: ScheduleDayResponse = schedule;
	const b: ScheduleDay = scheduleResponse;
	const c: GameSnapshotResponse = game;
	const d: GameSnapshot = gameResponse;
	void a;
	void b;
	void c;
	void d;
}
void assertResponseAliasesStayInSync;

/** Same proof, routed through `ApiResponseFor` the way the handlers use it. */
function assertApiResponseForResolves(
	schedule: ApiResponseFor<"GET /api/v1/schedule">,
	game: ApiResponseFor<"GET /api/v1/games/:gamePk">,
): void
{
	const a: ScheduleDay = schedule;
	const b: GameSnapshot = game;
	void a;
	void b;
}
void assertApiResponseForResolves;

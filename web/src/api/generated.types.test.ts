import type {
	ApiRoute, GameSnapshotResponse, ScheduleDayResponse,
} from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import type { paths } from "./generated/bt-api.v1.js";

/**
 * The spec-fidelity gate (S29, ADR-016). S27's `oasdiff` gate only compares the
 * spec with its own previous self; this compares it with reality. For every route
 * in the S26 table, the type generated from `openapi/bt-api.v1.json` and the
 * route's `<DomainType>Response` alias — the type actually on the wire — must be
 * mutually assignable. A field the emitter drops, a nullability it loses, a union
 * it widens: each breaks one direction, and `tsc` (in `pnpm build`) fails.
 *
 * Compared against the alias, never the bare domain type, so the ADR-014 DTO
 * adapter stays free to diverge from `GameSnapshot` / `ScheduleDay` later.
 */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Json200<P extends keyof paths> = paths[P]["get"]["responses"][200]["content"]["application/json"];

/**
 * One entry per S26 route, keyed by the route literal: `satisfies Record<ApiRoute, true>`
 * fails when a route is added without a fidelity pairing, and each value only
 * type-checks as `true` when the pairing round-trips losslessly.
 */
const fidelity = {
	"GET /api/v1/games/:gamePk": true as MutuallyAssignable<Json200<"/api/v1/games/{gamePk}">, GameSnapshotResponse>,
	"GET /api/v1/schedule": true as MutuallyAssignable<Json200<"/api/v1/schedule">, ScheduleDayResponse>,
} satisfies Record<ApiRoute, true>;

/** The other side of exhaustiveness: every path the spec publishes is one the table knows. */
type SpecPathsCovered = MutuallyAssignable<keyof paths, "/api/v1/games/{gamePk}" | "/api/v1/schedule">;
const specPathsCovered: SpecPathsCovered = true;

/**
 * Teeth: a deliberately wrong pairing must fail. `@ts-expect-error` itself errors
 * when the line below it compiles, so a generated type that had collapsed into
 * something `any`-ish (assignable to everything) would fail the build here.
 */
// @ts-expect-error — the game route's generated type is not a ScheduleDayResponse.
const wrongPairing: MutuallyAssignable<Json200<"/api/v1/games/{gamePk}">, ScheduleDayResponse> = true;

describe("generated response types — spec fidelity", () =>
{
	it("pairs every S26 route with its generated type (checked by tsc)", () =>
	{
		expect(Object.keys(fidelity).sort()).toEqual(["GET /api/v1/games/:gamePk", "GET /api/v1/schedule"]);
		expect([specPathsCovered, wrongPairing]).toEqual([true, true]);
	});
});

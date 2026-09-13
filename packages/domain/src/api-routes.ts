/**
 * The typed BT API route contract (ADR-014 "the wire boundary").
 *
 * One runtime-enumerable table maps each route to its response type. Both the
 * server's sender (`functions/src/handlers/api.ts`) and the client's fetch
 * helper (`web/src/api/client.ts`) consume this same declaration — a route and
 * its response cannot disagree without breaking a typecheck on one end or the
 * other.
 *
 * Response types are named `<DomainType>Response` aliases (ADR-014 "Response
 * aliases — the DTO seam"), not the bare domain type. Each alias is *derived*
 * (`type XResponse = X`) — structurally identical to its source today, so this
 * is not a second, hand-authored shape and does not reopen the "one type
 * source" drift risk. It plants a named seam: the day an internal-only reason
 * forces a domain field to change while the wire needs to stay stable, that
 * divergence lives in the matching `to<DomainType>Response` mapping function
 * (still a passthrough today), not in a rewrite of the route table.
 */
import type { GameSnapshot, ScheduleDay } from "./types.js";

export type ScheduleDayResponse = ScheduleDay;
export type GameSnapshotResponse = GameSnapshot;

/** The one error-body shape every 4xx path returns. */
export interface ApiErrorResponse {
	error: string;
	hint?: string;
}

/** Passthrough today — see the module doc for why this indirection exists. */
export function toScheduleDayResponse(day: ScheduleDay): ScheduleDayResponse
{
	return day;
}

/** Passthrough today — see the module doc for why this indirection exists. */
export function toGameSnapshotResponse(game: GameSnapshot): GameSnapshotResponse
{
	return game;
}

/** Registry a route's response-type name is checked against — no unenforced string keys. */
export interface ApiResponseTypes {
	ScheduleDayResponse: ScheduleDayResponse;
	GameSnapshotResponse: GameSnapshotResponse;
	ApiErrorResponse: ApiErrorResponse;
}

/**
 * `"<METHOD> <path>"` → the name of its response type in {@link ApiResponseTypes}.
 * A runtime value (not just a type), so S27 can walk it to generate a spec.
 * `satisfies` makes an unknown type-name key a compile error.
 */
export const ApiRoutes = {
	"GET /api/v1/schedule": "ScheduleDayResponse",
	"GET /api/v1/games/:gamePk": "GameSnapshotResponse",
} as const satisfies Record<string, keyof ApiResponseTypes>;

export type ApiRoute = keyof typeof ApiRoutes;

/** The response type a given route resolves to, via the registry above. */
export type ApiResponseFor<R extends ApiRoute> = ApiResponseTypes[(typeof ApiRoutes)[R]];

import type { ApiResponseFor, ApiRoute } from "@bt/domain";

/**
 * The one unchecked `JSON.parse` → type step (ADR-014 "the wire boundary").
 * `_route` is not read at runtime — it exists purely so `R` is inferred from
 * the route-key argument at each call site. No call site passes an explicit
 * type argument, so the response type can only ever come from the shared
 * `ApiRoutes` table, never from what a caller happens to assert.
 */
async function getJson<R extends ApiRoute>(_route: R, path: string): Promise<ApiResponseFor<R>>
{
	const res = await fetch(path);
	if (!res.ok)
	{
		throw new Error(`Request failed (${res.status}): ${path}`);
	}
	return (await res.json()) as ApiResponseFor<R>;
}

export function fetchSchedule(date: string): Promise<ApiResponseFor<"GET /api/v1/schedule">>
{
	return getJson("GET /api/v1/schedule", `/api/v1/schedule?date=${encodeURIComponent(date)}`);
}

export function fetchGame(gamePk: number): Promise<ApiResponseFor<"GET /api/v1/games/:gamePk">>
{
	return getJson("GET /api/v1/games/:gamePk", `/api/v1/games/${gamePk}`);
}

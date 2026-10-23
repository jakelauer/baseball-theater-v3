import type {
	ApiErrorResponse, ApiResponseFor, ApiRoute,
} from "@bt/domain";
import { toGameSnapshotResponse, toScheduleDayResponse } from "@bt/domain";
import type { IngestDeps } from "../services/ingest.js";
import { getOrRefreshGame, getOrRefreshSchedule } from "../services/ingest.js";

export type ApiContext = {
	ingest: IngestDeps;
};

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Authorization, Content-Type",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(status: number, body: unknown): Response
{
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...CORS_HEADERS,
		},
	});
}

/**
 * Builds a route's typed response. `_route` is not read at runtime — it
 * exists purely so `R` (and therefore `body`'s required type) is inferred
 * from the route-key argument at each call site. `body` is checked against
 * that route's entry in the ApiRoutes table (`@bt/domain`) — sending the
 * wrong shape for a known route fails the `functions` typecheck (S26 check 6
 * proves this).
 */
export function sendJson<R extends ApiRoute>(
	status: number,
	_route: R,
	body: ApiResponseFor<R>,
): Response
{
	return json(status, body);
}

function sendError(status: number, body: ApiErrorResponse): Response
{
	return json(status, body);
}

function notFound(): Response
{
	return sendError(404, {
		error: "not_found",
	});
}

/**
 * Routes that stream instead of returning one JSON body (S18's live-game hub
 * upgrades to a WebSocket, ADR-020). They have no response type, so they can't
 * be keys of `ApiRoutes`; the route-table check allows a dispatched route
 * outside `ApiRoutes` only if it is named here. Empty until S18 adds one.
 */
export const STREAMING_ROUTE_EXCEPTIONS = [] as const satisfies readonly string[];

type StreamingRoute = (typeof STREAMING_ROUTE_EXCEPTIONS)[number];

/** One dispatchable route: its `"<METHOD> <path>"` key, as written in `ApiRoutes`. */
export interface RouteEntry
{
	route: ApiRoute | StreamingRoute;
	/** Per-parameter value patterns; a `:param` without one matches any single segment. */
	params?: Record<string, RegExp>;
	handle: (url: URL, params: Record<string, string>, ctx: ApiContext) => Promise<Response>;
}

/**
 * Every route the API dispatches, keyed exactly as in `ApiRoutes`, so the
 * route-table test can compare the two sets (S44). Typing `route` as
 * `ApiRoute | StreamingRoute` also makes an undeclared key a compile error.
 */
export const API_ROUTER: readonly RouteEntry[] = [
	{
		route: "GET /api/v1/schedule",
		handle: async (url, _params, ctx) =>
		{
			const date = url.searchParams.get("date");
			if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
			{
				return sendError(400, {
					error: "date_required",
					hint: "YYYY-MM-DD",
				});
			}
			const force = url.searchParams.get("refresh") === "1";
			const day = await getOrRefreshSchedule(ctx.ingest, date, {
				force,
			});
			return sendJson(200, "GET /api/v1/schedule", toScheduleDayResponse(day));
		},
	},
	{
		route: "GET /api/v1/games/:gamePk",
		params: {
			gamePk: /^\d+$/,
		},
		handle: async (url, params, ctx) =>
		{
			const gamePk = Number(params.gamePk);
			const force = url.searchParams.get("refresh") === "1";
			const game = await getOrRefreshGame(ctx.ingest, gamePk, {
				force,
			});
			if (!game)
			{
				return notFound();
			}
			return sendJson(200, "GET /api/v1/games/:gamePk", toGameSnapshotResponse(game));
		},
	},
];

/**
 * Matches a request against one route key. Returns the `:param` values, or
 * null when the method, segment count, a literal segment, or a param pattern
 * differs. Path segments are compared raw (no decoding), as the hand-written
 * matcher before S44 did.
 */
function matchRoute(entry: RouteEntry, method: string, pathname: string): Record<string, string> | null
{
	const [routeMethod, routePath = ""] = entry.route.split(" ");
	if (routeMethod !== method) return null;
	const want = routePath.split("/");
	const got = pathname.split("/");
	if (want.length !== got.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < want.length; i++)
	{
		const w = want[i] ?? "";
		const g = got[i] ?? "";
		if (w.startsWith(":"))
		{
			const name = w.slice(1);
			const pattern = entry.params?.[name];
			if (g === "" || (pattern && !pattern.test(g))) return null;
			params[name] = g;
		}
		else if (w !== g)
		{
			return null;
		}
	}
	return params;
}

/**
 * What disagrees between the routes a router dispatches and the declared
 * contract: a dispatched route that is neither declared nor a named streaming
 * exception, or a declared route nothing dispatches. Empty means they agree.
 */
export function routeTableMismatches(
	router: readonly { route: string }[],
	declared: readonly string[],
	streaming: readonly string[],
): string[]
{
	const dispatched = new Set(router.map((r) => r.route));
	const undeclared = [...dispatched]
		.filter((r) => !declared.includes(r) && !streaming.includes(r))
		.map((r) => `dispatched but not in ApiRoutes: ${r}`);
	const undispatched = declared
		.filter((r) => !dispatched.has(r))
		.map((r) => `in ApiRoutes but not dispatched: ${r}`);
	return [...undeclared, ...undispatched];
}

/**
 * The API as a Fetch-standard handler (ADR-017: a Worker's handler is
 * `(Request) => Response`). Node's local server adapts to it in
 * `adapters/node/http.ts`. `/health` is an operational probe for the local
 * server, not part of the `/api` contract, so it sits outside `API_ROUTER`.
 */
export async function handleApiRequest(
	request: Request,
	ctx: ApiContext,
): Promise<Response>
{
	if (request.method === "OPTIONS")
	{
		return new Response(null, {
			status: 204,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				...CORS_HEADERS,
			},
		});
	}

	const url = new URL(request.url);
	const { pathname } = url;

	if (request.method === "GET" && pathname === "/health")
	{
		return json(200, {
			ok: true,
			service: "bt-functions-local",
		});
	}

	for (const entry of API_ROUTER)
	{
		const params = matchRoute(entry, request.method, pathname);
		if (params) return entry.handle(url, params, ctx);
	}

	return notFound();
}

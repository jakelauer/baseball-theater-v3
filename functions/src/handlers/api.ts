import type { IncomingMessage, ServerResponse } from "node:http";
import type {
	ApiErrorResponse, ApiResponseFor, ApiRoute,
} from "@bt/domain";
import { toGameSnapshotResponse, toScheduleDayResponse } from "@bt/domain";
import type { IngestDeps } from "../services/ingest.js";
import { getOrRefreshGame, getOrRefreshSchedule } from "../services/ingest.js";

export type ApiContext = {
	ingest: IngestDeps;
};

function writeJson(res: ServerResponse, status: number, body: unknown): void
{
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
		"Access-Control-Allow-Methods": "GET, OPTIONS",
	});
	res.end(payload);
}

/**
 * Sends a route's typed response body. `_route` is not read at runtime — it
 * exists purely so `R` (and therefore `body`'s required type) is inferred
 * from the route-key argument at each call site. `body` is checked against
 * that route's entry in the ApiRoutes table (`@bt/domain`) — sending the
 * wrong shape for a known route fails the `functions` typecheck (S26 check 6
 * proves this).
 */
export function sendJson<R extends ApiRoute>(
	res: ServerResponse,
	status: number,
	_route: R,
	body: ApiResponseFor<R>,
): void
{
	writeJson(res, status, body);
}

function sendError(res: ServerResponse, status: number, body: ApiErrorResponse): void
{
	writeJson(res, status, body);
}

function notFound(res: ServerResponse): void
{
	sendError(res, 404, {
		error: "not_found",
	});
}

export async function handleApiRequest(
	req: IncomingMessage,
	res: ServerResponse,
	ctx: ApiContext,
): Promise<void>
{
	if (req.method === "OPTIONS")
	{
		writeJson(res, 204, {});
		return;
	}

	const host = req.headers.host ?? "localhost";
	const url = new URL(req.url ?? "/", `http://${host}`);
	const { pathname } = url;

	if (req.method === "GET" && pathname === "/health")
	{
		writeJson(res, 200, {
			ok: true,
			service: "bt-functions-local",
		});
		return;
	}

	if (req.method === "GET" && pathname === "/api/v1/schedule")
	{
		const date = url.searchParams.get("date");
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
		{
			sendError(res, 400, {
				error: "date_required",
				hint: "YYYY-MM-DD",
			});
			return;
		}
		const force = url.searchParams.get("refresh") === "1";
		const day = await getOrRefreshSchedule(ctx.ingest, date, {
			force,
		});
		sendJson(res, 200, "GET /api/v1/schedule", toScheduleDayResponse(day));
		return;
	}

	const gameMatch = pathname.match(/^\/api\/v1\/games\/(\d+)$/);
	if (req.method === "GET" && gameMatch)
	{
		const gamePk = Number(gameMatch[1]);
		const force = url.searchParams.get("refresh") === "1";
		const game = await getOrRefreshGame(ctx.ingest, gamePk, {
			force,
		});
		if (!game)
		{
			notFound(res);
			return;
		}
		sendJson(res, 200, "GET /api/v1/games/:gamePk", toGameSnapshotResponse(game));
		return;
	}

	notFound(res);
}

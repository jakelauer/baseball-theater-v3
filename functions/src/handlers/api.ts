import type { IncomingMessage, ServerResponse } from "node:http";
import type { IngestDeps } from "../services/ingest.js";
import { getOrRefreshGame, getOrRefreshSchedule } from "../services/ingest.js";

export type ApiContext = {
	ingest: IngestDeps;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void
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

function notFound(res: ServerResponse): void
{
	sendJson(res, 404, {
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
		sendJson(res, 204, {});
		return;
	}

	const host = req.headers.host ?? "localhost";
	const url = new URL(req.url ?? "/", `http://${host}`);
	const { pathname } = url;

	if (req.method === "GET" && pathname === "/health")
	{
		sendJson(res, 200, {
			ok: true,
			service: "bt-functions-local",
		});
		return;
	}

	if (req.method === "GET" && pathname === "/api/schedule")
	{
		const date = url.searchParams.get("date");
		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
		{
			sendJson(res, 400, {
				error: "date_required",
				hint: "YYYY-MM-DD",
			});
			return;
		}
		const force = url.searchParams.get("refresh") === "1";
		const day = await getOrRefreshSchedule(ctx.ingest, date, {
			force,
		});
		sendJson(res, 200, day);
		return;
	}

	const gameMatch = pathname.match(/^\/api\/games\/(\d+)$/);
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
		sendJson(res, 200, game);
		return;
	}

	notFound(res);
}

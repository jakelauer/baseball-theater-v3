import type {
	IncomingMessage, RequestListener, ServerResponse,
} from "node:http";

/** A Fetch-standard handler: what a Worker runs (ADR-017) and what Node adapts to here. */
export type FetchHandler = (request: Request) => Promise<Response>;

/**
 * Node `IncomingMessage` → Fetch `Request`. The host header supplies the
 * origin (there is no TLS locally, so the scheme is http). GET and HEAD carry
 * no body; anything else buffers it, since every route today is small JSON.
 */
async function toRequest(req: IncomingMessage): Promise<Request>
{
	const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
	const headers = new Headers();
	for (const [name, value] of Object.entries(req.headers))
	{
		if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
		else if (value !== undefined) headers.set(name, value);
	}
	const method = req.method ?? "GET";
	let body: Buffer | undefined;
	if (method !== "GET" && method !== "HEAD")
	{
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		body = Buffer.concat(chunks);
	}
	return new Request(url, {
		method,
		headers,
		body,
	});
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void>
{
	res.writeHead(response.status, Object.fromEntries(response.headers));
	res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Serves a Fetch handler from Node's `http.createServer`, so the local server
 * and tests run the same handler the Worker will (S45). A thrown error becomes
 * a 500 `{ "error": "internal" }`, as the local server answered before S44.
 */
export function toNodeListener(handler: FetchHandler): RequestListener
{
	return (req, res) =>
	{
		void toRequest(req)
			.then(handler)
			.then((response) => writeResponse(res, response))
			.catch((err: unknown) =>
			{
				console.error(err);
				res.writeHead(500, {
					"Content-Type": "application/json",
				});
				res.end(JSON.stringify({
					error: "internal",
				}));
			});
	};
}

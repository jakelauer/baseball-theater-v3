import { createServer } from "node:http";
import {
	describe, expect, it, vi,
} from "vitest";
import type { FetchHandler } from "./http.js";
import { toNodeListener } from "./http.js";

async function withListener(handler: FetchHandler, run: (base: string) => Promise<void>): Promise<void>
{
	const server = createServer(toNodeListener(handler));
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const addr = server.address();
	if (!addr || typeof addr === "string") throw new Error("no port");
	try
	{
		await run(`http://127.0.0.1:${addr.port}`);
	}
	finally
	{
		await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
	}
}

describe("toNodeListener", () =>
{
	it("passes method, URL, headers and body through, and writes the Response back", async () =>
	{
		await withListener(async (request) =>
		{
			const body = await request.text();
			return new Response(JSON.stringify({
				method: request.method,
				path: new URL(request.url).pathname,
				header: request.headers.get("x-test"),
				body,
			}), {
				status: 201,
				headers: {
					"X-Echo": "yes",
				},
			});
		}, async (base) =>
		{
			const res = await fetch(`${base}/echo?q=1`, {
				method: "POST",
				headers: {
					"X-Test": "abc",
				},
				body: "hello",
			});
			expect(res.status).toBe(201);
			expect(res.headers.get("x-echo")).toBe("yes");
			expect(await res.json()).toEqual({
				method: "POST",
				path: "/echo",
				header: "abc",
				body: "hello",
			});
		});
	});

	it("answers 500 internal when the handler throws", async () =>
	{
		const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
		await withListener(() => Promise.reject(new Error("boom")), async (base) =>
		{
			const res = await fetch(`${base}/anything`);
			expect(res.status).toBe(500);
			expect(await res.json()).toEqual({
				error: "internal",
			});
		});
		expect(log).toHaveBeenCalled();
		log.mockRestore();
	});
});

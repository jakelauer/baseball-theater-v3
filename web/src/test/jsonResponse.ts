/**
 * A real JSON `Response` for `fetch` stubs. The generated API client (S49)
 * reads status, headers and body from it, so plain `{ ok, json }` objects
 * don't work. Every web test that stubs the API builds its responses here.
 */
export function jsonResponse(body: unknown, status = 200): Response
{
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

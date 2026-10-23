import createClient from "openapi-fetch";
import type { paths } from "./generated/bt-api.v1.js";

/**
 * The one way the app calls the BT API (ADR-016, S49): an `openapi-fetch`
 * client typed by the paths generated from the published spec. A path that the
 * spec doesn't declare, a missing parameter, or a wrong response type is a
 * compile error, and paths are never assembled by hand.
 *
 * `baseUrl` is the page's own origin (in dev the Vite proxy forwards API calls):
 * `openapi-fetch` builds a `Request`, which needs an absolute URL outside the
 * browser (jsdom tests). The app only runs where `location` exists. `fetch` is
 * looked up per call rather than captured once, so tests can stub the global.
 */
export const api = createClient<paths>({
	baseUrl: location.origin,
	fetch: (request) => globalThis.fetch(request),
});

/**
 * Unwraps an `openapi-fetch` result: the typed body, or an error naming the
 * status and URL. Every route's success body is required, so `data` is set
 * whenever `response.ok`.
 */
function unwrap<T>(result: { data?: T;
	response: Response; }): T
{
	if (!result.response.ok || result.data === undefined)
	{
		throw new Error(`Request failed (${result.response.status}): ${result.response.url}`);
	}
	return result.data;
}

export async function fetchSchedule(date: string)
{
	return unwrap(await api.GET("/api/v1/schedule", {
		params: {
			query: {
				date,
			},
		},
	}));
}

export async function fetchGame(gamePk: number)
{
	return unwrap(await api.GET("/api/v1/games/{gamePk}", {
		params: {
			path: {
				gamePk,
			},
		},
	}));
}

import createClient from "openapi-fetch";
import { getSessionToken } from "../session/token.js";
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
 * Every call carries the session, when there is one, through this one
 * middleware (S59), so later account calls (settings, S6) inherit it instead
 * of each adding a header.
 */
api.use({
	onRequest({ request })
	{
		const token = getSessionToken();
		if (token) request.headers.set("Authorization", `Bearer ${token}`);
		return request;
	},
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

/**
 * The signed-in account, or null when the server answers 401: to the session,
 * 401 means "signed out", not a failure. Any other non-OK status throws.
 */
export async function fetchMe()
{
	const result = await api.GET("/api/v1/me");
	if (result.response.status === 401) return null;
	return unwrap(result);
}

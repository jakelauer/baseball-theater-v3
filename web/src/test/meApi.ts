import { vi } from "vitest";
import { DEV_SIGN_IN_TOKEN } from "../session/session.js";
import { jsonResponse } from "./jsonResponse.js";

/** What the API's `/api/v1/me` returns for the local `dev:test-user` session (S8). */
export const DEV_ACCOUNT = {
	uid: "test-user",
	email: "dev@local.test",
	role: "member",
	entitlements: {
		tier: "none",
		fasterLiveRefresh: false,
		cloudSyncedSettings: false,
		savantLinks: false,
	},
};

/**
 * Stubs `fetch` the way the API answers `/api/v1/me`: the dev account for the
 * `dev:test-user` bearer, 401 for anything else. Other paths stay pending, so
 * tests that only look at the session or the shell aren't waiting on game data.
 */
export function stubMeApi(): ReturnType<typeof vi.fn>
{
	const fetchMock = vi.fn(async (request: Request): Promise<Response> =>
	{
		if (new URL(request.url).pathname !== "/api/v1/me") return new Promise<Response>(() => undefined);
		return request.headers.get("Authorization") === `Bearer ${DEV_SIGN_IN_TOKEN}` ? jsonResponse(DEV_ACCOUNT) : jsonResponse({
			error: "unauthorized",
		}, 401);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

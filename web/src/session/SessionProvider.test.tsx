import { QueryClientProvider } from "@tanstack/react-query";
import {
	act, cleanup, renderHook, waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
	afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createQueryClient } from "../api/queryClient.js";
import { jsonResponse } from "../test/jsonResponse.js";
import { stubMeApi } from "../test/meApi.js";
import { SessionProvider } from "./SessionProvider.js";
import {
	ACCOUNT_QUERY_KEY, DEV_SIGN_IN_TOKEN, useSession,
} from "./session.js";
import { getSessionToken, setSessionToken } from "./token.js";

function renderSession(queryClient = createQueryClient())
{
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<SessionProvider>{children}</SessionProvider>
		</QueryClientProvider>
	);
	return renderHook(() => useSession(), {
		wrapper,
	});
}

beforeEach(() =>
{
	setSessionToken(null);
});

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("SessionProvider", () =>
{
	it("starts signed out without asking the server when no token is stored", () =>
	{
		const fetchMock = stubMeApi();
		const { result } = renderSession();
		expect(result.current.status).toBe("signedOut");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reads GET /api/v1/me with the stored token, through the client's middleware", async () =>
	{
		const fetchMock = stubMeApi();
		setSessionToken(DEV_SIGN_IN_TOKEN);
		const { result } = renderSession();
		expect(result.current.status).toBe("loading");
		await waitFor(() => expect(result.current.status).toBe("signedIn"));
		expect(result.current.status === "signedIn" && result.current.account).toMatchObject({
			uid: "test-user",
			email: "dev@local.test",
		});
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(new URL(request.url).pathname).toBe("/api/v1/me");
		expect(request.headers.get("Authorization")).toBe(`Bearer ${DEV_SIGN_IN_TOKEN}`);
	});

	it("reads a 401 as signed out and drops the stale token", async () =>
	{
		stubMeApi();
		setSessionToken("expired-session");
		const { result } = renderSession();
		await waitFor(() => expect(result.current.status).toBe("signedOut"));
		expect(getSessionToken()).toBeNull();
	});

	it("counts an unreachable server as signed out for now, keeping the token to retry later", async () =>
	{
		vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 503)));
		setSessionToken(DEV_SIGN_IN_TOKEN);
		const { result } = renderSession();
		await waitFor(() => expect(result.current.status).toBe("signedOut"));
		expect(getSessionToken()).toBe(DEV_SIGN_IN_TOKEN);
	});

	it("signs in as dev:test-user in development and invalidates account queries", async () =>
	{
		stubMeApi();
		const queryClient = createQueryClient();
		queryClient.setQueryData([...ACCOUNT_QUERY_KEY, "settings"], {
			hideScores: false,
		});
		const { result } = renderSession(queryClient);
		await act(() => result.current.signIn());
		expect(result.current.status).toBe("signedIn");
		expect(getSessionToken()).toBe(DEV_SIGN_IN_TOKEN);
		expect(queryClient.getQueryState([...ACCOUNT_QUERY_KEY, "settings"])?.isInvalidated).toBe(true);
	});

	it("does nothing on signIn() in a production build, until the Logto hand-off replaces it", async () =>
	{
		vi.stubEnv("PROD", true);
		const fetchMock = stubMeApi();
		const { result } = renderSession();
		await act(() => result.current.signIn());
		expect(result.current.status).toBe("signedOut");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sign-out clears the session and removes account queries, keeping game data", async () =>
	{
		stubMeApi();
		setSessionToken(DEV_SIGN_IN_TOKEN);
		const queryClient = createQueryClient();
		queryClient.setQueryData([...ACCOUNT_QUERY_KEY, "settings"], {
			hideScores: true,
		});
		queryClient.setQueryData(["game", 744834], {
			gamePk: 744834,
		});
		const { result } = renderSession(queryClient);
		await waitFor(() => expect(result.current.status).toBe("signedIn"));

		act(() => result.current.signOut());
		expect(result.current.status).toBe("signedOut");
		expect(getSessionToken()).toBeNull();
		expect(queryClient.getQueryData([...ACCOUNT_QUERY_KEY, "settings"])).toBeUndefined();
		expect(queryClient.getQueryData(["game", 744834])).toEqual({
			gamePk: 744834,
		});
	});

	it("useSession outside the provider is an error", () =>
	{
		expect(() => renderHook(() => useSession())).toThrow("SessionProvider");
	});
});

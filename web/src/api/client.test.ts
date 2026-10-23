import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { fetchGame, fetchSchedule } from "./client.js";

/** Stubs the global fetch with one real `Response`, as `openapi-fetch` reads status, headers and body from it. */
function mockFetchOnce(body: unknown, status = 200): void
{
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(JSON.stringify(body), {
			status,
			headers: {
				"Content-Type": "application/json",
			},
		})),
	);
}

/** The path and query of the one request the client sent through the stubbed fetch. */
function requestedPath(): string
{
	const request = vi.mocked(fetch).mock.calls[0]?.[0] as Request;
	const url = new URL(request.url);
	return url.pathname + url.search;
}

afterEach(() =>
{
	vi.unstubAllGlobals();
});

describe("fetchSchedule", () =>
{
	it("requests the versioned schedule route and returns the parsed body", async () =>
	{
		mockFetchOnce({
			date: "2024-07-04",
			games: [],
			fetchedAt: "x",
			windowMode: "cache",
		});
		const day = await fetchSchedule("2024-07-04");
		expect(day.date).toBe("2024-07-04");
		expect(requestedPath()).toBe("/api/v1/schedule?date=2024-07-04");
	});

	it("throws when the response is not ok", async () =>
	{
		mockFetchOnce({}, 500);
		await expect(fetchSchedule("2024-07-04")).rejects.toThrow("Request failed (500)");
	});
});

describe("fetchGame", () =>
{
	it("requests the versioned game route and returns the parsed body", async () =>
	{
		mockFetchOnce({
			gamePk: 744834,
			plays: [],
		});
		const game = await fetchGame(744834);
		expect(game.gamePk).toBe(744834);
		expect(requestedPath()).toBe("/api/v1/games/744834");
	});
});

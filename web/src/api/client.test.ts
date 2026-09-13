import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { fetchGame, fetchSchedule } from "./client.js";

function mockFetchOnce(body: unknown, ok = true, status = 200): void
{
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({
			ok,
			status,
			json: async () => body,
		})),
	);
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
		expect(fetch).toHaveBeenCalledWith("/api/v1/schedule?date=2024-07-04");
	});

	it("throws when the response is not ok", async () =>
	{
		mockFetchOnce({}, false, 500);
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
		expect(fetch).toHaveBeenCalledWith("/api/v1/games/744834");
	});
});

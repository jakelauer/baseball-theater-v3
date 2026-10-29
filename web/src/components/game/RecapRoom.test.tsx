/**
 * The Recap room (S10) on the committed 823823 fixture (its recap derived from the
 * recorded MLB content), rendered through the game page so every assertion is made
 * inside the Recap tab panel; and the Recap tab's presence.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen, within,
} from "@testing-library/react";
import {
	MemoryRouter, Route, Routes,
} from "react-router-dom";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import type { GamePayload } from "../../api/game.js";
import { createQueryClient } from "../../api/queryClient.js";
import { GamePage } from "../../pages/GamePage.js";
import { jsonResponse } from "../../test/jsonResponse.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures");

function fixture(gamePk: number): GamePayload
{
	return {
		...JSON.parse(readFileSync(join(FIXTURES, `game-${gamePk}.json`), "utf8")),
		plays: [],
		fetchedAt: "2026-09-05T23:00:00.000Z",
		windowMode: "cache",
		version: 1,
		lastChangedAt: "2026-09-05T23:00:00.000Z",
	} as GamePayload;
}

/** Renders a game route and waits for the game chrome. */
async function renderGame(game: GamePayload, path: string): Promise<void>
{
	vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(game))));
	render(
		<MantineProvider>
			<QueryClientProvider client={createQueryClient()}>
				<MemoryRouter initialEntries={[path]}>
					<Routes>
						<Route path="/game/:gamePk" element={<GamePage variant="mobile" />} />
						<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		</MantineProvider>,
	);
	await screen.findByTestId("game-topbar");
}

/** The room tab names, in order. */
function tabs(): string[]
{
	return within(screen.getAllByRole("tablist")[0]!).getAllByRole("tab").map((t) => t.textContent ?? "");
}

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
});

describe("the Recap room (S10)", () =>
{
	it("recap panel: shows the fixture's recap text", async () =>
	{
		await renderGame(fixture(823823), "/game/823823/recap");
		const panel = screen.getByRole("tabpanel");
		expect(panel).toHaveTextContent("reliever Ryan Zeferjahn kept getting up and moving around");
		expect(within(panel).getByText(/^1\. Zeferjahn comes through in big spot$/)).toBeInTheDocument();
	});

	it("headline: the headline is a heading, then the text, then Source: MLB", async () =>
	{
		await renderGame(fixture(823823), "/game/823823/recap");
		const panel = screen.getByRole("tabpanel");
		const heading = within(panel).getByRole("heading", {
			level: 2,
		});
		expect(heading).toHaveTextContent("Zeferjahn records 1st Cubs save, Conforto notches club's 200th HR in win over Marlins");
		const source = within(panel).getByText("Source: MLB");
		const article = within(panel).getByRole("article", {
			name: "Recap",
		});
		expect(article.firstElementChild).toBe(heading);
		expect(article.lastElementChild).toBe(source);
	});

	it("document only: no linescore, no R / H / E, no score element in the recap panel", async () =>
	{
		await renderGame(fixture(823823), "/game/823823/recap");
		const panel = screen.getByRole("tabpanel");
		expect(within(panel).queryByTestId("inning-cell")).toBeNull();
		expect(within(panel).queryByRole("table")).toBeNull();
		for (const header of ["R", "H", "E"]) expect(within(panel).queryByRole("columnheader", {
			name: header,
		})).toBeNull();
		expect(within(panel).queryByRole("status")).toBeNull();
		expect(within(panel).queryByTestId("live-status")).toBeNull();
	});

	it("tab presence: a final game with a recap shows Recap", async () =>
	{
		await renderGame(fixture(823823), "/game/823823");
		expect(tabs()).toEqual(["Videos", "Plays", "Box", "Recap"]);
	});

	it("tab presence: 744834 has no recap, so no Recap tab, and /recap opens the default room", async () =>
	{
		await renderGame(fixture(744834), "/game/744834/recap");
		expect(tabs()).toEqual(["Videos", "Plays", "Box"]);
		expect(screen.getByRole("tab", {
			name: "Videos",
		})).toHaveAttribute("aria-selected", "true");
		expect(screen.queryByRole("article", {
			name: "Recap",
		})).toBeNull();
	});
});

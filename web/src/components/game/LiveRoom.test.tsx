/**
 * The Live pitch theater (S64) on `fixtures/game-823823-live.json`, the mid-game moment
 * S63 folded from MLB's recording: top 3rd, two out, bases loaded, Bregman batting
 * against Gusto with five pitches thrown. Rendered through the game page, so every
 * assertion is made inside the Live tab panel.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	act, cleanup, fireEvent, render, screen, waitFor, within,
} from "@testing-library/react";
import {
	MemoryRouter, Route, Routes,
} from "react-router-dom";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import type { GamePayload } from "../../api/game.js";
import { writeGame } from "../../api/game.js";
import { createQueryClient } from "../../api/queryClient.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { GamePage } from "../../pages/GamePage.js";
import { jsonResponse } from "../../test/jsonResponse.js";
import { createRenderCounter } from "../../test/renderCount.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures");

function fixture(): GamePayload
{
	return {
		...JSON.parse(readFileSync(join(FIXTURES, "game-823823-live.json"), "utf8")),
		fetchedAt: "2026-09-05T20:57:20.000Z",
		windowMode: "active",
		version: 1,
		lastChangedAt: "2026-09-05T20:57:20.000Z",
	} as GamePayload;
}

/** Renders `/game/823823/live` at a pairing and returns the Live tab panel. */
async function livePanel(variant: LayoutVariant = "mobile", client = createQueryClient()): Promise<HTMLElement>
{
	vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(fixture()))));
	render(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<MemoryRouter initialEntries={["/game/823823/live"]}>
					<Routes>
						<Route path="/game/:gamePk/:tab" element={<GamePage variant={variant} />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		</MantineProvider>,
	);
	await screen.findByTestId("matchup-cards");
	return screen.getByRole("tabpanel");
}

/** The pitch-sequence rows, top to bottom. */
function rows(panel: HTMLElement): HTMLElement[]
{
	return within(panel).getAllByTestId("pitch-row");
}

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
});

describe("the Live pitch theater (S64)", () =>
{
	it("diamond: bases loaded marks first, second and third, and names them", async () =>
	{
		const panel = await livePanel();
		const diamond = within(panel).getByRole("img", {
			name: "Runners on second, third, first",
		});
		for (const base of ["first", "second", "third"]) expect(within(diamond as unknown as HTMLElement).getByTestId(`base-${base}`)).toHaveAttribute("data-occupied", "true");
	});

	it("diamond: a base with no runner is empty", async () =>
	{
		const game = fixture();
		vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({
			...game,
			live: {
				...game.live!,
				runners: {
					first: 608324,
					second: null,
					third: null,
				},
			},
		}))));
		render(
			<MantineProvider>
				<QueryClientProvider client={createQueryClient()}>
					<MemoryRouter initialEntries={["/game/823823/live"]}>
						<Routes>
							<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
						</Routes>
					</MemoryRouter>
				</QueryClientProvider>
			</MantineProvider>,
		);
		const diamond = await screen.findByTestId("base-diamond");
		expect(diamond).toHaveAccessibleName("Runners on first");
		expect(within(diamond as unknown as HTMLElement).getByTestId("base-second")).toHaveAttribute("data-occupied", "false");
	});

	it("cards: Gusto's hand and pitches through this at-bat, Bregman's hand and line before it ends", async () =>
	{
		const panel = await livePanel();
		expect(within(panel).getByTestId("card-pitcher")).toHaveTextContent("Ryan Gusto");
		expect(within(panel).getByTestId("card-pitcher")).toHaveTextContent("RHP · 55 Pitches (35 S)");
		expect(within(panel).getByTestId("card-batter")).toHaveTextContent("Alex Bregman");
		expect(within(panel).getByTestId("card-batter")).toHaveTextContent("RHB · 0-1");
	});

	it("sequence: newest first, the newest expanded with spin, break, release, zone and result; the rest collapsed", async () =>
	{
		const panel = await livePanel();
		const list = rows(panel);
		expect(list).toHaveLength(5);
		expect(list.map((row) => row.textContent)).toEqual([
			expect.stringMatching(/^5 · Four-Seam Fastball/),
			expect.stringMatching(/^4 · Four-Seam Fastball/),
			expect.stringMatching(/^3 · Sweeper/),
			expect.stringMatching(/^2 · Cutter/),
			expect.stringMatching(/^1 · Four-Seam Fastball/),
		]);
		expect(list.map((row) => row.dataset.expanded)).toEqual(["true", "false", "false", "false", "false"]);
		const detail = within(list[0]!).getByTestId("pitch-detail");
		for (const text of ["2,329 RPM", "6.4 in / 15.6 in", "6.4 ft", "Outside, Up-Left", "Hit By Pitch"]) expect(detail).toHaveTextContent(text);
		expect(list[0]).toHaveTextContent("96.0 mph");
	});

	it("sequence: at medium and desktop the detail is the four-column grid and the status sits beside the zone (variant)", async () =>
	{
		for (const variant of ["medium", "desktop"] as const)
		{
			const panel = await livePanel(variant);
			expect(within(panel).getByTestId("pitch-detail-grid")).toBeInTheDocument();
			const top = within(panel).getByTestId("live-top");
			expect(within(top).getByTestId("live-zone")).toBeInTheDocument();
			expect(within(top).getByTestId("live-status")).toBeInTheDocument();
			cleanup();
		}
	});

	it("select: a row or a zone dot selects that pitch; Up and Down move the selection", async () =>
	{
		const panel = await livePanel();
		fireEvent.click(within(rows(panel)[3]!).getByRole("button"));
		expect(rows(panel)[3]).toHaveAttribute("data-expanded", "true");
		expect(rows(panel)[0]).toHaveAttribute("data-expanded", "false");

		fireEvent.click(within(panel).getByRole("button", {
			name: "Pitch 3",
		}));
		expect(rows(panel)[2]).toHaveAttribute("data-expanded", "true");

		const third = within(rows(panel)[2]!).getByRole("button");
		fireEvent.keyDown(third, {
			key: "ArrowDown",
		});
		expect(rows(panel)[3]).toHaveAttribute("data-expanded", "true");
		expect(document.activeElement).toBe(within(rows(panel)[3]!).getByRole("button"));
		fireEvent.keyDown(document.activeElement!, {
			key: "ArrowUp",
		});
		expect(rows(panel)[2]).toHaveAttribute("data-expanded", "true");
	});

	it("zone: the catcher's view alone, a dot per pitch, the batter on their side; Side view and Top view links show those charts", async () =>
	{
		const panel = await livePanel();
		const scene = within(panel).getByTestId("catcher-view");
		expect(within(scene).getAllByRole("button")).toHaveLength(5);
		expect(within(scene).getByRole("img", {
			name: "Right-handed batter",
		})).toBeInTheDocument();
		expect(within(panel).queryByText(/Side view \(/)).toBeNull();
		expect(within(panel).queryByText(/Top-down/)).toBeNull();

		fireEvent.click(within(panel).getByRole("button", {
			name: "Side view",
		}));
		expect(within(panel).getByText(/Side view \(/)).toBeInTheDocument();
		expect(within(panel).queryByText(/Top-down/)).toBeNull();
		fireEvent.click(within(panel).getByRole("button", {
			name: "Top view",
		}));
		expect(within(panel).getByText(/Top-down/)).toBeInTheDocument();
		fireEvent.click(within(panel).getByRole("button", {
			name: "Side view",
		}));
		expect(within(panel).queryByText(/Side view \(/)).toBeNull();
		expect(within(panel).getByRole("button", {
			name: "Top view",
		})).toHaveAttribute("aria-pressed", "true");
	});

	it("live: a new pitch arriving jumps to it and replays it in the zone; the pitch there on opening doesn't", async () =>
	{
		const client = createQueryClient();
		const panel = await livePanel("mobile", client);
		expect(within(panel).queryByTestId("zone-ball")).toBeNull();
		// Something older picked by hand gives way to the new pitch.
		fireEvent.click(within(rows(panel)[3]!).getByRole("button"));
		const game = fixture();
		const last = game.plays.at(-1)!;
		const thrown = last.pitches.at(-1)!;
		await act(async () =>
		{
			writeGame(client, {
				...game,
				version: 2,
				plays: [...game.plays.slice(0, -1), {
					...last,
					pitches: [...last.pitches, {
						...thrown,
						pitchNumber: thrown.pitchNumber + 1,
						playId: "new-pitch",
					}],
				}],
			});
		});
		await waitFor(() => expect(rows(panel)[0]).toHaveTextContent(new RegExp(`^${thrown.pitchNumber + 1} · `)));
		expect(rows(panel)[0]).toHaveAttribute("data-expanded", "true");
		await waitFor(() => expect(within(panel).getByTestId("zone-ball")).toBeInTheDocument());
	});

	it("no win probability renders", async () =>
	{
		const panel = await livePanel("desktop");
		expect(panel).not.toHaveTextContent(/win probability/i);
	});

	it("an at-bat with no pitch yet selects none; a finished at-bat shows its result; no plays shows the status alone", async () =>
	{
		const game = fixture();
		const last = game.plays.at(-1)!;
		vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({
			...game,
			plays: [...game.plays.slice(0, -1), {
				...last,
				pitches: [],
			}],
		}))));
		render(
			<MantineProvider>
				<QueryClientProvider client={createQueryClient()}>
					<MemoryRouter initialEntries={["/game/823823/live"]}>
						<Routes>
							<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
						</Routes>
					</MemoryRouter>
				</QueryClientProvider>
			</MantineProvider>,
		);
		await screen.findByTestId("matchup-cards");
		expect(screen.queryAllByTestId("pitch-row")).toHaveLength(0);
		expect(within(within(screen.getByRole("tabpanel")).getByTestId("catcher-view")).queryAllByRole("button")).toHaveLength(0);
		fireEvent.click(within(screen.getByRole("tabpanel")).getByRole("button", {
			name: "Side view",
		}));
		expect(within(screen.getByRole("tabpanel")).getByText("Select a pitch to see trajectory.")).toBeInTheDocument();
		cleanup();

		vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({
			...game,
			plays: game.plays.slice(0, -1),
		}))));
		render(
			<MantineProvider>
				<QueryClientProvider client={createQueryClient()}>
					<MemoryRouter initialEntries={["/game/823823/live"]}>
						<Routes>
							<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
						</Routes>
					</MemoryRouter>
				</QueryClientProvider>
			</MantineProvider>,
		);
		expect(await screen.findByTestId("matchup-line")).toHaveTextContent(/^Gusto vs Busch.*Result: /);
		cleanup();

		vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({
			...game,
			plays: [],
		}))));
		render(
			<MantineProvider>
				<QueryClientProvider client={createQueryClient()}>
					<MemoryRouter initialEntries={["/game/823823/live"]}>
						<Routes>
							<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
						</Routes>
					</MemoryRouter>
				</QueryClientProvider>
			</MantineProvider>,
		);
		expect(await screen.findByTestId("live-status")).toBeInTheDocument();
		expect(screen.queryByTestId("matchup-cards")).toBeNull();
	});

	it("render count: one cache update of the game commits the Live panel twice (baseline)", async () =>
	{
		const client = createQueryClient();
		const counter = createRenderCounter("live");
		vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(fixture()))));
		render(
			<MantineProvider>
				<QueryClientProvider client={client}>
					<MemoryRouter initialEntries={["/game/823823/live"]}>
						<counter.Counted>
							<Routes>
								<Route path="/game/:gamePk/:tab" element={<GamePage variant="mobile" />} />
							</Routes>
						</counter.Counted>
					</MemoryRouter>
				</QueryClientProvider>
			</MantineProvider>,
		);
		await screen.findByTestId("matchup-cards");
		counter.reset();
		const game = fixture();
		await act(async () =>
		{
			writeGame(client, {
				...game,
				version: 2,
			});
		});
		// Baseline (S64, ADR-026), measured 2026-10-29: one cache update commits the
		// Live panel twice. A regression that multiplies it shows here. The cache
		// notifies its readers on the next tick.
		await waitFor(() => expect(counter.count()).toBeGreaterThan(0));
		await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
		expect(counter.count()).toBe(2);
	});
});

/**
 * The Box room (S2) on the committed 823823 fixture (CHC @ MIA, Final 6–5), rendered
 * through the game page so every assertion is made inside the Box tab panel.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen, within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	MemoryRouter, Route, Routes,
} from "react-router-dom";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { contrastSafeTeamColor } from "@bt/domain";
import type { GamePayload } from "../../api/game.js";
import { createQueryClient } from "../../api/queryClient.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { GamePage } from "../../pages/GamePage.js";
import { jsonResponse } from "../../test/jsonResponse.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures");

/** A committed game fixture, shaped as the API serves it. */
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

/** Renders `/game/<pk>/box` at a pairing and returns the Box tab panel. */
async function boxPanel(game: GamePayload, variant: LayoutVariant = "mobile"): Promise<HTMLElement>
{
	vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(game))));
	render(
		<MantineProvider>
			<QueryClientProvider client={createQueryClient()}>
				<MemoryRouter initialEntries={[`/game/${game.gamePk}/box`]}>
					<Routes>
						<Route path="/game/:gamePk/:tab" element={<GamePage variant={variant} />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		</MantineProvider>,
	);
	await screen.findByTestId("game-topbar");
	return screen.getByRole("tabpanel");
}

/** `#rrggbb` → the `rgb(r, g, b)` jsdom reports for a style. */
function rgb(hex: string): string
{
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
});

describe("the Box room (S2)", () =>
{
	it("box panel: nine boxed innings and R H E, a CHC/MIA switcher, one batting table at a time, Game info", async () =>
	{
		const panel = await boxPanel(fixture(823823));
		const linescore = within(panel).getByRole("table", {
			name: "Linescore",
		});
		const [away, home] = within(linescore).getAllByTestId("linescore-row");
		expect(within(away!).getAllByTestId("inning-cell")).toHaveLength(9);
		expect(within(home!).getAllByTestId("inning-cell")).toHaveLength(9);
		const totals = (row: HTMLElement) => [...row.querySelectorAll("td")].slice(-3).map((td) => td.textContent);
		expect(within(away!).getByRole("rowheader")).toHaveTextContent("CHC");
		expect(totals(away!)).toEqual(["6", "13", "0"]);
		expect(within(home!).getByRole("rowheader")).toHaveTextContent("MIA");
		expect(totals(home!)).toEqual(["5", "6", "0"]);

		const chc = within(panel).getByRole("button", {
			name: "CHC",
		});
		const mia = within(panel).getByRole("button", {
			name: "MIA",
		});
		expect(chc).toHaveAttribute("aria-pressed", "true");
		expect(within(panel).getAllByRole("table", {
			name: /batting$/,
		})).toHaveLength(1);
		expect(within(panel).getByRole("table", {
			name: "CHC batting",
		})).toHaveTextContent("P. Crow-Armstrong");

		await userEvent.click(mia);
		expect(mia).toHaveAttribute("aria-pressed", "true");
		expect(within(panel).queryByRole("table", {
			name: "CHC batting",
		})).toBeNull();
		const miaTable = within(panel).getByRole("table", {
			name: "MIA batting",
		});
		expect(miaTable).not.toHaveTextContent("P. Crow-Armstrong");

		const info = within(panel).getByRole("region", {
			name: "Game info",
		});
		expect(info).toHaveTextContent("Venue");
		expect(info).toHaveTextContent("loanDepot park");
		expect(info).not.toHaveTextContent("loanDepot park.");
	});

	it("batting row: name, position and AB R H RBI BB SO AVG for Pete Crow-Armstrong", async () =>
	{
		const panel = await boxPanel(fixture(823823));
		const [first] = within(panel).getAllByTestId("batting-row");
		const cells = [...first!.querySelectorAll("td")].map((td) => td.textContent);
		// 1-4, BB, 2 K, RBI; season .279 (fixtures/raw/live-823823.json).
		expect(cells).toEqual(["P. Crow-ArmstrongCF", "4", "0", "1", "1", "1", "2", ".279"]);
	});

	it("swatch: each switcher button carries its team's TeamSwatch", async () =>
	{
		const panel = await boxPanel(fixture(823823));
		const group = within(panel).getByRole("group", {
			name: "Team",
		});
		const swatches = within(group).getAllByTestId("team-swatch");
		expect(swatches.map((s) => s.style.background)).toEqual([rgb(contrastSafeTeamColor(112)!), rgb(contrastSafeTeamColor(146)!)]);
	});

	it("no box score: a game without one shows the room's empty state", async () =>
	{
		const panel = await boxPanel(fixture(744834));
		expect(within(panel).getByText("No box score yet.")).toBeInTheDocument();
		expect(within(panel).queryByRole("table")).toBeNull();
	});

	it("box panel: a box score with no info lines and no season average leaves those blank", async () =>
	{
		const game = fixture(823823);
		const boxscore = game.boxscore!;
		const panel = await boxPanel({
			...game,
			boxscore: {
				...boxscore,
				teams: {
					...boxscore.teams,
					away: {
						batting: boxscore.teams.away.batting.map((b) => ({
							...b,
							avg: null,
						})),
					},
				},
				info: [],
			},
		});
		expect(within(panel).queryByRole("region", {
			name: "Game info",
		})).toBeNull();
		const [first] = within(panel).getAllByTestId("batting-row");
		expect([...first!.querySelectorAll("td")].at(-1)?.textContent).toBe("");
	});

	for (const variant of ["medium", "desktop"] as const)
	{
		it(`variant: at ${variant} the Box room draws the same modules`, async () =>
		{
			const panel = await boxPanel(fixture(823823), variant);
			expect(within(panel).getByTestId("box-room")).toHaveAttribute("data-variant", variant);
			expect(within(panel).getByRole("table", {
				name: "Linescore",
			})).toBeInTheDocument();
			expect(within(panel).getByRole("group", {
				name: "Team",
			})).toBeInTheDocument();
			expect(within(panel).getAllByRole("table", {
				name: /batting$/,
			})).toHaveLength(1);
			expect(within(panel).getByRole("region", {
				name: "Game info",
			})).toBeInTheDocument();
		});
	}
});

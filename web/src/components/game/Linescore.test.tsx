/**
 * The boxed-inning linescore (S2) beyond the final game the Box room tests use: no
 * linescore yet, and a game in progress whose later innings are empty boxes.
 */
import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen, within,
} from "@testing-library/react";
import {
	afterEach, describe, expect, it,
} from "vitest";
import type { GamePayload } from "../../api/game.js";
import { Linescore } from "./Linescore.js";

afterEach(cleanup);

function rows(linescore: GamePayload["linescore"]): HTMLElement[]
{
	render(
		<MantineProvider>
			<Linescore linescore={linescore} away="NYM" home="WSH" />
		</MantineProvider>,
	);
	return screen.getAllByTestId("linescore-row");
}

describe("Linescore (S2)", () =>
{
	it("with no linescore: nine empty boxes per team and blank totals", () =>
	{
		const [away] = rows(null);
		const cells = within(away!).getAllByTestId("inning-cell");
		expect(cells).toHaveLength(9);
		expect(cells.every((c) => c.textContent === "")).toBe(true);
		expect([...away!.querySelectorAll("td")].slice(-2).map((td) => td.textContent)).toEqual(["", ""]);
	});

	it("in progress: innings not reached are empty boxes; R sums the boxes", () =>
	{
		const [away, home] = rows({
			currentInning: 2,
			inningState: "Bottom",
			isTopInning: false,
			outs: 1,
			balls: 0,
			strikes: 0,
			teams: {
				away: {
					runs: 1,
					hits: 2,
					errors: 0,
				},
				home: {
					runs: 0,
					hits: 0,
					errors: 1,
				},
			},
			innings: [
				{
					num: 1,
					away: {
						runs: 1,
					},
					home: {
						runs: 0,
					},
				},
				{
					num: 2,
					away: {
						runs: 0,
					},
					home: {
						runs: null,
					},
				},
			],
		});
		expect(within(away!).getAllByTestId("inning-cell").map((c) => c.textContent)).toEqual(["1", "0", "", "", "", "", "", "", ""]);
		expect(within(home!).getAllByTestId("inning-cell")[1]).toHaveTextContent(/^$/);
		expect([...away!.querySelectorAll("td")].slice(-3).map((td) => td.textContent)).toEqual(["1", "2", "0"]);
	});
});

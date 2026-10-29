/**
 * S61: the team components paint `contrastSafeTeamColor` — the lightened, readable
 * value — and never the raw official color or a hex of their own.
 */
import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
	afterEach, describe, expect, it,
} from "vitest";
import { contrastSafeTeamColor, teamColor } from "@bt/domain";
import { MatchupAbbr } from "./MatchupAbbr.js";
import { TeamEdge } from "./TeamEdge.js";
import { TeamSwatch } from "./TeamSwatch.js";

const YANKEES = 147;
const RED_SOX = 111;

function renderIn(node: ReactNode): void
{
	render(<MantineProvider>{node}</MantineProvider>);
}

/** `#rrggbb` → the `rgb(r, g, b)` jsdom reports for a style. */
function rgb(hex: string): string
{
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

afterEach(cleanup);

describe("team components (S61)", () =>
{
	it("TeamEdge paints the contrast-safe color, not the raw navy", () =>
	{
		renderIn(<TeamEdge teamId={YANKEES} />);
		const edge = screen.getByTestId("team-edge");
		expect(edge.style.background).toBe(rgb(contrastSafeTeamColor(YANKEES)!));
		expect(edge.style.background).not.toBe(rgb(teamColor(YANKEES)!));
		expect(edge).toHaveAttribute("aria-hidden");
	});

	it("TeamSwatch paints the contrast-safe color at the size asked for", () =>
	{
		renderIn(<TeamSwatch teamId={YANKEES} size={12} />);
		const swatch = screen.getByTestId("team-swatch");
		expect(swatch.style.background).toBe(rgb(contrastSafeTeamColor(YANKEES)!));
		expect(swatch.style.borderRadius).toBe("50%");
	});

	it("MatchupAbbr shows away @ home with each team's swatch", () =>
	{
		renderIn(<MatchupAbbr awayId={YANKEES} homeId={RED_SOX} />);
		expect(screen.getByTestId("matchup-abbr")).toHaveTextContent("NYY@BOS");
		const [away, home] = screen.getAllByTestId("team-swatch");
		expect(away!.style.background).toBe(rgb(contrastSafeTeamColor(YANKEES)!));
		expect(home!.style.background).toBe(rgb(contrastSafeTeamColor(RED_SOX)!));
	});

	it("an unknown team gets no color and no abbreviation", () =>
	{
		renderIn(<MatchupAbbr awayId={1} homeId={RED_SOX} />);
		const [away] = screen.getAllByTestId("team-swatch");
		expect(away!.style.background).toBe("");
		expect(screen.getByTestId("matchup-abbr")).toHaveTextContent(/^@BOS$/);
	});
});

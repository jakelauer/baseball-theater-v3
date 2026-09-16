import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import type { GamePayload } from "./game.js";
import { useGame, writeGame } from "./game.js";
import { createQueryClient } from "./queryClient.js";

function gamePayload(overrides: Partial<GamePayload> = {}): GamePayload
{
	return {
		gamePk: 744834,
		gameDate: "2024-07-04T17:05:00Z",
		officialDate: "2024-07-04",
		status: {
			abstractGameState: "Live",
			codedGameState: "I",
			detailedState: "In Progress",
		},
		teams: {
			away: {
				id: 147,
				abbreviation: "NYY",
				name: "New York Yankees",
				teamName: "Yankees",
			},
			home: {
				id: 111,
				abbreviation: "BOS",
				name: "Boston Red Sox",
				teamName: "Red Sox",
			},
		},
		highlights: [],
		plays: [],
		fetchedAt: "2024-07-04T18:00:00.000Z",
		windowMode: "cache",
		...overrides,
	} as GamePayload;
}

/** Reads the shared cache entry; also counts how often it mounts. */
function Score({ gamePk, onMount }: { gamePk: number;
	onMount?: () => void; })
{
	const { data } = useGame(gamePk);
	useState(() =>
	{
		onMount?.();
		return null;
	});
	return <span data-testid="score">{data?.status.detailedState ?? "loading"}</span>;
}

/** A second reader of the same game, with local state that a remount would reset. */
function OpenAtBat({ gamePk }: { gamePk: number })
{
	const { data } = useGame(gamePk);
	const [expanded, setExpanded] = useState(false);
	return (
		<div>
			<span data-testid="state">{data?.status.detailedState ?? "loading"}</span>
			<span data-testid="expanded">{expanded ? "open" : "closed"}</span>
			<button type="button" onClick={() => setExpanded(true)}>expand</button>
		</div>
	);
}

afterEach(() =>
{
	vi.unstubAllGlobals();
});

describe("one cache entry, many readers", () =>
{
	it("updates both readers from a single write, without remounting either", async () =>
	{
		const user = userEvent.setup();
		const client = createQueryClient();
		client.setQueryData(["game", 744834], gamePayload());
		const mounts = vi.fn();

		render(
			<QueryClientProvider client={client}>
				<Score gamePk={744834} onMount={mounts} />
				<OpenAtBat gamePk={744834} />
			</QueryClientProvider>,
		);

		expect(screen.getByTestId("score")).toHaveTextContent("In Progress");
		expect(screen.getByTestId("state")).toHaveTextContent("In Progress");

		// Something the user is holding open — a remount would slam it shut.
		await user.click(screen.getByRole("button", {
			name: "expand",
		}));
		expect(screen.getByTestId("expanded")).toHaveTextContent("open");

		writeGame(client, gamePayload({
			status: {
				abstractGameState: "Final",
				codedGameState: "F",
				detailedState: "Final",
			},
		}));

		// Both readers moved on the one write…
		expect(await screen.findAllByText("Final")).toHaveLength(2);
		expect(screen.getByTestId("score")).toHaveTextContent("Final");
		expect(screen.getByTestId("state")).toHaveTextContent("Final");
		// …and neither remounted: local state survived and the mount counter never moved.
		expect(screen.getByTestId("expanded")).toHaveTextContent("open");
		expect(mounts).toHaveBeenCalledTimes(1);
	});
});

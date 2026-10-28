import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import type { ViewStateProps } from "./ViewState.js";
import { ViewState } from "./ViewState.js";

function renderState(props: ViewStateProps)
{
	return render(
		<MantineProvider>
			<ViewState {...props} />
		</MantineProvider>,
	);
}

afterEach(cleanup);

describe("ViewState (S60)", () =>
{
	it("loading keeps the page title above the loader", () =>
	{
		renderState({
			kind: "loading",
			title: "Scoreboard",
		});
		expect(screen.getByRole("heading", {
			name: "Scoreboard",
		})).toBeInTheDocument();
		expect(screen.getByLabelText("Loading")).toBeInTheDocument();
	});

	it("loading without a title draws only the loader", () =>
	{
		renderState({
			kind: "loading",
		});
		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByLabelText("Loading")).toBeInTheDocument();
	});

	it("empty is one sentence", () =>
	{
		renderState({
			kind: "empty",
			message: "No games scheduled for this date.",
		});
		expect(screen.getByText("No games scheduled for this date.")).toBeInTheDocument();
	});

	it("error names what failed, the recovery hint, and Retry calls back", async () =>
	{
		const onRetry = vi.fn();
		renderState({
			kind: "error",
			title: "Couldn't load games",
			onRetry,
		});
		expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load games");
		expect(screen.getByText("Check your connection and try again")).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", {
			name: "Retry",
		}));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});

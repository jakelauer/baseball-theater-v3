import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { LiveIndicator } from "./LiveIndicator.js";

/** Answers `matchMedia` as a browser whose reduced-motion preference is `reduce`. */
function preferReducedMotion(reduce: boolean)
{
	vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
		matches: reduce && query.includes("prefers-reduced-motion: reduce"),
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false,
	}));
}

function renderIndicator()
{
	render(
		<MantineProvider>
			<LiveIndicator />
		</MantineProvider>,
	);
}

afterEach(() =>
{
	cleanup();
	vi.restoreAllMocks();
});

describe("LiveIndicator (S60)", () =>
{
	it("blinks the dot beside the LIVE label", () =>
	{
		preferReducedMotion(false);
		renderIndicator();
		expect(screen.getByText("LIVE")).toBeInTheDocument();
		expect(screen.getByTestId("live-dot").style.animation).toMatch(/bt-blink/);
	});

	it("stops blinking under prefers-reduced-motion", async () =>
	{
		preferReducedMotion(true);
		renderIndicator();
		await vi.waitFor(() => expect(screen.getByTestId("live-dot").style.animation).toBe("none"));
	});
});

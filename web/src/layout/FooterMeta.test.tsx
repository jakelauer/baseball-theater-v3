import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import {
	afterEach, describe, expect, it,
} from "vitest";
import { FooterMeta } from "./FooterMeta.js";

afterEach(cleanup);

function renderFooter(fetchedAt?: string, now?: Date)
{
	render(
		<MantineProvider>
			<FooterMeta fetchedAt={fetchedAt} now={now} />
		</MantineProvider>,
	);
	return screen.getByRole("contentinfo");
}

describe("FooterMeta (S60)", () =>
{
	it("renders Fetched {age} · baseball.theater from fetchedAgo", () =>
	{
		const footer = renderFooter("2026-10-28T12:00:00.000Z", new Date("2026-10-28T12:00:12.000Z"));
		expect(footer).toHaveTextContent(/^Fetched 12s ago · baseball\.theater$/);
	});

	it("shows only the site name before any payload has a fetch time", () =>
	{
		expect(renderFooter()).toHaveTextContent(/^baseball\.theater$/);
	});

	it("never says scores are hidden", () =>
	{
		expect(renderFooter("2026-10-28T12:00:00.000Z", new Date("2026-10-28T14:00:00.000Z"))).not.toHaveTextContent(/Scores hidden/);
	});
});

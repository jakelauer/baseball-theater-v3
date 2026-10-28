/**
 * The rail's look, pinned to the Figma `nav-rail` values (S83): the active item
 * filled Primary with a Primary Light marker, inactive items with an invisible
 * marker at the same inset, 15px labels, an 11px Light version line.
 */
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen, within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
	afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createQueryClient } from "../api/queryClient.js";
import { SessionProvider } from "../session/SessionProvider.js";
import { setSessionToken } from "../session/token.js";
import { stubMeApi } from "../test/meApi.js";
import { NavRail } from "./NavRail.js";

function renderRail(path: string)
{
	render(
		<MantineProvider>
			<QueryClientProvider client={createQueryClient()}>
				<SessionProvider>
					<MemoryRouter initialEntries={[path]}>
						<NavRail />
					</MemoryRouter>
				</SessionProvider>
			</QueryClientProvider>
		</MantineProvider>,
	);
}

const item = (name: string) => screen.getByRole("link", {
	name,
});

beforeEach(() =>
{
	setSessionToken(null);
	stubMeApi();
});

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
});

describe("NavRail active item (S83)", () =>
{
	it("fills the active item Primary with the Primary Light marker; an inactive item has no visible marker", () =>
	{
		renderRail("/standings");
		const active = item("Standings");
		expect(active).toHaveAttribute("aria-current", "page");
		expect(active.style.background).toBe("var(--bt-primary)");
		expect(within(active).getByTestId("nav-marker").style.background).toBe("var(--bt-primary-light)");

		const inactive = item("Scoreboard");
		expect(inactive).not.toHaveAttribute("aria-current");
		expect(inactive.style.background).toBe("transparent");
		expect(within(inactive).getByTestId("nav-marker").style.background).toBe("transparent");
	});
});

describe("NavRail Figma values (S83)", () =>
{
	it("Figma: 44px rows, 8px radius, 12/16 padding, a 4x20 marker 12px before a 15px label; active SemiBold", () =>
	{
		renderRail("/games/2024-07-04");
		const active = item("Scoreboard");
		expect(active.style.height).toBe("44px");
		expect(active.style.borderRadius).toBe("8px");
		expect(active.style.padding).toBe("12px 16px");
		expect(active.style.gap).toBe("12px");
		const marker = within(active).getByTestId("nav-marker");
		expect(marker.style.width).toBe("4px");
		expect(marker.style.height).toBe("20px");
		const label = within(active).getByText("Scoreboard");
		expect(label.style.fontSize).toMatch(/15px|calc\(0\.9375rem/);
		expect(label.style.fontWeight).toBe("600");
		expect(within(item("Search")).getByText("Search").style.fontWeight).toBe("400");
	});

	it("Figma: the version line is 11px Light, not dimmed", () =>
	{
		renderRail("/games/2024-07-04");
		const version = screen.getByTestId("version-line");
		expect(version.style.fontSize).toMatch(/11px|calc\(0\.6875rem/);
		expect(version.style.color).toBe("var(--bt-light)");
	});
});

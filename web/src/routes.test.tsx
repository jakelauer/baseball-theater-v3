/**
 * Settings are signed-in only (ADR-027, S59): signed out, the nav item is
 * absent and `/settings` redirects to the scoreboard; signed in, both render.
 * Renders the real shell and routes with the session read from a stubbed API.
 */
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import {
	afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createQueryClient } from "./api/queryClient.js";
import { AppShellLayout } from "./layout/AppShellLayout.js";
import { AppRoutes } from "./routes.js";
import { SessionProvider } from "./session/SessionProvider.js";
import { DEV_SIGN_IN_TOKEN } from "./session/session.js";
import { setSessionToken } from "./session/token.js";
import { stubMeApi } from "./test/meApi.js";

/** Shows the router's current path, to observe redirects. */
function CurrentPath()
{
	return <output aria-label="path">{useLocation().pathname}</output>;
}

function renderApp(path: string)
{
	render(
		<MantineProvider>
			<QueryClientProvider client={createQueryClient()}>
				<SessionProvider>
					<MemoryRouter initialEntries={[path]}>
						<AppShellLayout>
							<AppRoutes />
						</AppShellLayout>
						<CurrentPath />
					</MemoryRouter>
				</SessionProvider>
			</QueryClientProvider>
		</MantineProvider>,
	);
}

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

describe("Settings gating", () =>
{
	it("signed out: no Settings nav item, and /settings redirects to the scoreboard", async () =>
	{
		renderApp("/settings");
		expect(await screen.findByLabelText("path")).toHaveTextContent(/^\/games\/2024-07-04$/);
		expect(screen.getByRole("link", {
			name: "Scoreboard",
		})).toBeInTheDocument();
		expect(screen.queryByRole("link", {
			name: "Settings",
		})).toBeNull();
	});

	it("signed in: the Settings nav item and /settings both render", async () =>
	{
		setSessionToken(DEV_SIGN_IN_TOKEN);
		renderApp("/settings");
		expect(await screen.findByRole("link", {
			name: "Settings",
		})).toBeInTheDocument();
		expect(screen.getByLabelText("path")).toHaveTextContent(/^\/settings$/);
		expect(screen.getByRole("heading", {
			name: /settings/i,
		})).toBeInTheDocument();
	});
});

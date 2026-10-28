import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
	afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createQueryClient } from "../api/queryClient.js";
import { SessionProvider } from "../session/SessionProvider.js";
import { setSessionToken } from "../session/token.js";
import { stubMeApi } from "../test/meApi.js";
import { AppHeader } from "./AppHeader.js";

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

describe("AppHeader Figma values (S83)", () =>
{
	it("Figma: signed out, 'Sign in' is 14px Light beside the account icon", async () =>
	{
		render(
			<MantineProvider>
				<QueryClientProvider client={createQueryClient()}>
					<SessionProvider>
						<MemoryRouter>
							<AppHeader burger drawerOpened={false} onBurger={() => undefined} />
						</MemoryRouter>
					</SessionProvider>
				</QueryClientProvider>
			</MantineProvider>,
		);
		const signIn = await screen.findByText("Sign in");
		expect(signIn.style.fontSize).toMatch(/14px|calc\(0\.875rem/);
		expect(signIn.style.color).toBe("var(--bt-light)");
	});
});

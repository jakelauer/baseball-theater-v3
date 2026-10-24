import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { createQueryClient } from "../api/queryClient.js";
import { stubMeApi } from "../test/meApi.js";
import { DevSessionControl } from "./DevSessionControl.js";
import { SessionProvider } from "./SessionProvider.js";
import { DEV_SIGN_IN_TOKEN } from "./session.js";
import { getSessionToken, setSessionToken } from "./token.js";

function renderControl()
{
	render(
		<MantineProvider>
			<QueryClientProvider client={createQueryClient()}>
				<SessionProvider>
					<DevSessionControl />
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
	vi.unstubAllEnvs();
});

describe("DevSessionControl", () =>
{
	it("signs in as dev:test-user, then offers sign-out", async () =>
	{
		renderControl();
		await userEvent.click(screen.getByRole("button", {
			name: "Dev sign-in (test-user)",
		}));
		expect(getSessionToken()).toBe(DEV_SIGN_IN_TOKEN);
		await userEvent.click(await screen.findByRole("button", {
			name: "Dev sign-out (test-user)",
		}));
		expect(getSessionToken()).toBeNull();
		expect(screen.getByRole("button", {
			name: "Dev sign-in (test-user)",
		})).toBeInTheDocument();
	});

	it("is absent from a production build (import.meta.env.PROD)", () =>
	{
		vi.stubEnv("PROD", true);
		renderControl();
		expect(screen.queryByRole("button")).toBeNull();
	});
});

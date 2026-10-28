import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import type { Notice } from "./NoticeSlot.js";
import { NoticeSlot } from "./NoticeSlot.js";

afterEach(cleanup);

function renderSlot(notice: Notice | null)
{
	render(
		<MantineProvider>
			<NoticeSlot notice={notice} />
		</MantineProvider>,
	);
}

describe("NoticeSlot (S60)", () =>
{
	it("renders the banner with its message, Reload and ✕; Reload calls the action", async () =>
	{
		const reload = vi.fn();
		renderSlot({
			id: "update",
			message: "An update to Baseball Theater is ready.",
			action: {
				label: "Reload",
				onClick: reload,
			},
			dismissible: true,
		});
		expect(screen.getByRole("status")).toHaveTextContent("An update to Baseball Theater is ready.");
		await userEvent.click(screen.getByRole("button", {
			name: "Reload",
		}));
		expect(reload).toHaveBeenCalledOnce();
		expect(screen.getByRole("button", {
			name: "Dismiss",
		})).toBeInTheDocument();
	});

	it("✕ dismisses the notice", async () =>
	{
		renderSlot({
			id: "update",
			message: "An update to Baseball Theater is ready.",
			dismissible: true,
		});
		await userEvent.click(screen.getByRole("button", {
			name: "Dismiss",
		}));
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("renders a message-only banner with no action and no ✕ (the offline marker)", () =>
	{
		renderSlot({
			id: "offline",
			message: "You're offline. Scores as of 7:42 PM — 18 min ago.",
		});
		expect(screen.getByRole("status")).toHaveTextContent("You're offline.");
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders nothing without a notice", () =>
	{
		renderSlot(null);
		expect(screen.queryByTestId("notice-slot")).toBeNull();
	});
});

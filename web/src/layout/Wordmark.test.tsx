import { MantineProvider } from "@mantine/core";
import {
	cleanup, render, screen,
} from "@testing-library/react";
import {
	afterEach, describe, expect, it,
} from "vitest";
import { WORDMARK_FONT, Wordmark } from "./Wordmark.js";

afterEach(cleanup);

describe("Wordmark (S83)", () =>
{
	it("sets BT in clarendon-urw-extra-narrow 800 at 20px, the Figma wordmark's face, with a serif fallback", () =>
	{
		render(
			<MantineProvider>
				<Wordmark />
			</MantineProvider>,
		);
		const bt = screen.getByText("BT");
		expect(WORDMARK_FONT).toBe("\"clarendon-urw-extra-narrow\", serif");
		expect(bt.style.fontFamily).toContain("clarendon-urw-extra-narrow");
		expect(bt.style.fontFamily).toContain("serif");
		expect(bt.style.fontWeight).toBe("800");
		expect(bt.style.fontSize).toMatch(/20px|calc\(1\.25rem/);
		expect(screen.getByRole("img", {
			name: "Baseball Theater",
		})).toBeInTheDocument();
	});
});

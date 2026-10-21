import {
	cleanup, render, screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
	afterEach, describe, expect, it,
} from "vitest";
import { createRenderCounter } from "./renderCount.js";

afterEach(cleanup);

function Toggle()
{
	const [on, setOn] = useState(false);
	return <button type="button" onClick={() => setOn((v) => !v)}>{on ? "on" : "off"}</button>;
}

describe("createRenderCounter", () =>
{
	it("counts one commit on mount and one per state change", async () =>
	{
		const counter = createRenderCounter();
		render(<counter.Counted><Toggle /></counter.Counted>);
		expect(counter.count()).toBe(1);

		await userEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("button")).toHaveTextContent("on");
		expect(counter.count()).toBe(2);
	});

	it("reset counts only what follows", async () =>
	{
		const counter = createRenderCounter();
		render(<counter.Counted><Toggle /></counter.Counted>);
		counter.reset();
		await userEvent.click(screen.getByRole("button"));
		expect(counter.count()).toBe(1);
	});
});

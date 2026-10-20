import {
	describe, expect, it,
} from "vitest";
import { pitchOutcome } from "./pitch-outcome.js";

function pitch(isBall: boolean, isStrike: boolean, isInPlay: boolean)
{
	return {
		details: {
			call: "X",
			callDescription: "test",
			type: "FF",
			typeDescription: "Four-Seam Fastball",
			isBall,
			isStrike,
			isInPlay,
			ballColor: "rgba(170, 21, 11, 1.0)",
		},
	};
}

describe("pitchOutcome", () =>
{
	it("reads a ball", () =>
	{
		expect(pitchOutcome(pitch(true, false, false))).toBe("ball");
	});

	it("reads a called / swinging strike or foul", () =>
	{
		expect(pitchOutcome(pitch(false, true, false))).toBe("strike");
	});

	it("reads a ball in play, even if a strike flag is also set", () =>
	{
		expect(pitchOutcome(pitch(false, false, true))).toBe("inPlay");
		expect(pitchOutcome(pitch(false, true, true))).toBe("inPlay");
	});

	it("reads an unflagged pitch (hit-by-pitch, pitchout) as a ball", () =>
	{
		expect(pitchOutcome(pitch(false, false, false))).toBe("ball");
	});
});

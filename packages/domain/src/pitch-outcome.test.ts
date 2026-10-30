import {
	describe, expect, it,
} from "vitest";
import { isSwingingStrike, pitchOutcome } from "./pitch-outcome.js";

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

describe("isSwingingStrike", () =>
{
	const call = (code: string | null, isStrike = true) => ({
		details: {
			...pitch(!isStrike, isStrike, false).details,
			call: code,
		},
	});

	it("reads a swing and a miss — swinging, blocked, foul tip, missed bunt, swinging pitchout — as swinging", () =>
	{
		for (const code of ["S", "W", "T", "M", "Q"]) expect(isSwingingStrike(call(code))).toBe(true);
	});

	it("reads a called strike, a foul, a ball or a missing call as not swinging", () =>
	{
		expect(isSwingingStrike(call("C"))).toBe(false);
		expect(isSwingingStrike(call("F"))).toBe(false);
		expect(isSwingingStrike(call("S", false))).toBe(false);
		expect(isSwingingStrike(call(null))).toBe(false);
	});
});

/**
 * The pitch components on their edges (S64): the trajectory view with no pitch, a
 * batted ball and its playback; the pitch sequence when MLB sent almost nothing and at
 * the ends of the list; the cards with no hand and a multi-homer line. The happy paths
 * run through the Live room (`components/game/LiveRoom.test.tsx`).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AtBat, PitchEvent } from "@bt/domain";
import { MantineProvider } from "@mantine/core";
import {
	act, cleanup, fireEvent, render, screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { MatchupCards } from "./MatchupCards.js";
import { PitchSequence } from "./PitchSequence.js";
import { PitchTrajectoryView } from "./PitchTrajectoryView.js";
import { StrikeZoneChart } from "./StrikeZoneChart.js";

const PLAYS: AtBat[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/plays-823823.json"), "utf8"));
const IN_PLAY = PLAYS.flatMap((play) => play.pitches).find((pitch) => pitch.hitData && pitch.details.isInPlay)!;

/** A pitch with nothing but its number: no type, call, data or breaks. */
const BARE: PitchEvent = {
	pitchNumber: 1,
	playId: "",
	startTime: "",
	details: {
		call: null,
		callDescription: null,
		type: null,
		typeDescription: null,
		isBall: true,
		isStrike: false,
		isInPlay: false,
		ballColor: null,
	},
	count: {
		balls: 1,
		strikes: 0,
		outs: 0,
	},
	pitchData: null,
	hitData: null,
};

function wrap(node: ReactNode)
{
	return render(<MantineProvider>{node}</MantineProvider>);
}

afterEach(() =>
{
	cleanup();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("PitchTrajectoryView", () =>
{
	it("asks for a pitch when none is selected", () =>
	{
		wrap(<PitchTrajectoryView pitch={null} playing={false} />);
		expect(screen.getByText("Select a pitch to see trajectory.")).toBeInTheDocument();
	});

	it("plays a batted ball through to its end and reports it", () =>
	{
		vi.useFakeTimers();
		let now = 0;
		vi.stubGlobal("requestAnimationFrame", (tick: FrameRequestCallback) => setTimeout(() =>
		{
			now += 500;
			tick(now);
		}, 0));
		vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
		vi.spyOn(performance, "now").mockReturnValue(0);
		const onEnd = vi.fn();
		wrap(<PitchTrajectoryView pitch={IN_PLAY} playing onPlaybackEnd={onEnd} />);
		act(() =>
		{
			vi.runAllTimers();
		});
		expect(onEnd).toHaveBeenCalledOnce();
		expect(screen.getByText(/Batted ball/)).toBeInTheDocument();
	});
});

describe("a located pitch MLB described only in codes", () =>
{
	const coded: PitchEvent = {
		...IN_PLAY,
		details: {
			...IN_PLAY.details,
			typeDescription: null,
			callDescription: null,
			isInPlay: false,
		},
		pitchData: {
			...IN_PLAY.pitchData!,
			breaks: null,
		},
	};

	it("the zone and the trajectory fall back to the short type and call, and show no spin", () =>
	{
		wrap(
			<>
				<StrikeZoneChart pitches={[coded, BARE]} selectedPitchNumber={null} onSelectPitch={() => undefined} />
				<PitchTrajectoryView pitch={coded} playing={false} />
			</>,
		);
		expect(screen.getByText(`#${coded.pitchNumber} ${coded.details.type}`)).toBeInTheDocument();
		expect(screen.queryByText(/rpm/)).toBeNull();
		expect(screen.getByRole("button", {
			name: `Pitch ${coded.pitchNumber}`,
		})).toBeInTheDocument();
	});
});

describe("PitchSequence", () =>
{
	it("reads a dash for every detail MLB didn't send, and the call or type it falls back on", () =>
	{
		wrap(<PitchSequence pitches={[BARE]} selectedPitchNumber={1} onSelectPitch={() => undefined} variant="mobile" />);
		expect(screen.getByText("1 · Pitch")).toBeInTheDocument();
		expect(screen.getAllByText("—")).toHaveLength(4);
	});

	it("falls back to the short type and call, and keys other than Up / Down or past the ends do nothing", () =>
	{
		const onSelect = vi.fn();
		const pitch: PitchEvent = {
			...BARE,
			details: {
				...BARE.details,
				call: "B",
				type: "FF",
			},
		};
		wrap(<PitchSequence pitches={[pitch]} selectedPitchNumber={1} onSelectPitch={onSelect} variant="desktop" />);
		expect(screen.getByText("1 · FF")).toBeInTheDocument();
		const row = screen.getByRole("button");
		for (const key of ["ArrowDown", "ArrowUp", "Enter"]) fireEvent.keyDown(row, {
			key,
		});
		expect(onSelect).not.toHaveBeenCalled();
		expect(screen.getByTestId("pitch-detail-grid")).toBeInTheDocument();
	});
});

describe("MatchupCards", () =>
{
	it("leaves out a hand MLB didn't send, and counts home runs and RBI", () =>
	{
		const base = PLAYS[0]!;
		const homer = (index: number): AtBat => ({
			...base,
			about: {
				...base.about,
				atBatIndex: index,
				isComplete: true,
			},
			result: {
				...base.result,
				eventType: "home_run",
				rbi: 2,
			},
			matchup: {
				...base.matchup,
				batSide: null,
				pitchHand: null,
			},
		});
		const plays = [homer(0), homer(1)];
		wrap(<MatchupCards plays={plays} atBat={plays[1]!} />);
		expect(screen.getByTestId("card-batter")).toHaveTextContent(/2-2, 2 HR, 4 RBI$/);
		expect(screen.getByTestId("card-pitcher")).not.toHaveTextContent("HP");
	});
});

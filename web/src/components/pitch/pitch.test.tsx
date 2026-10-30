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
	act, cleanup, fireEvent, render, screen, within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
	afterEach, describe, expect, it, vi,
} from "vitest";
import { MatchupCards } from "./MatchupCards.js";
import { PitchSequence } from "./PitchSequence.js";
import { PlaysPanel } from "./PlaysPanel.js";
import { AtBatViewer } from "./AtBatViewer.js";
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
		wrap(<PitchTrajectoryView pitch={null} />);
		expect(screen.getByText("Select a pitch to see trajectory.")).toBeInTheDocument();
	});

	it("Animate plays the pitch and then the batted ball through to the end, then can be pressed again", () =>
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
		wrap(<PitchTrajectoryView pitch={IN_PLAY} />);
		fireEvent.click(screen.getByRole("button", {
			name: "Animate",
		}));
		// Each stubbed frame is half a second: past the plate on the first, so the
		// batted ball is in the air and the pitch's ball is gone.
		act(() =>
		{
			vi.advanceTimersToNextTimer();
		});
		expect(screen.queryAllByTestId("ball")).toHaveLength(0);
		act(() =>
		{
			vi.runAllTimers();
		});
		expect(screen.getByText(/Batted ball/)).toBeInTheDocument();
		// Done: back at rest, the ball where the pitch crossed the plate in both charts.
		expect(screen.getAllByTestId("ball")).toHaveLength(2);
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
				<PitchTrajectoryView pitch={coded} />
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
		cleanup();
		wrap(<MatchupCards plays={plays.slice(0, 1)} atBat={plays[0]!} />);
		expect(screen.getByTestId("card-batter")).toHaveTextContent(/1-1, HR, 2 RBI$/);
	});
});

describe("StrikeZoneChart, the catcher's view", () =>
{
	const atBat = PLAYS.find((play) => play.pitches.filter((pitch) => pitch.pitchData).length >= 3)!;

	it("draws one flight per located pitch from its own data, the selected one last and strongest", () =>
	{
		const strokes: { alpha: number;
			points: number }[] = [];
		let points = 0;
		const ctx = {
			globalAlpha: 1,
			setTransform: () => undefined,
			clearRect: () => undefined,
			beginPath: () =>
			{
				points = 0;
			},
			moveTo: () =>
			{
				points++;
			},
			lineTo: () =>
			{
				points++;
			},
			stroke()
			{
				strokes.push({
					alpha: this.globalAlpha,
					points,
				});
			},
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
		const located = atBat.pitches.filter((pitch) => pitch.pitchData);
		const selected = located[0]!.pitchNumber;
		wrap(<StrikeZoneChart pitches={[...atBat.pitches, BARE]} selectedPitchNumber={selected} onSelectPitch={() => undefined} />);
		expect(strokes).toHaveLength(located.length);
		expect(strokes.every((stroke) => stroke.points === 49)).toBe(true);
		expect(strokes.at(-1)!.alpha).toBe(1);
		expect(strokes[0]!.alpha).toBeLessThan(1);
		vi.restoreAllMocks();
	});

	it("dimensions the batter's zone in the empty box: top, bottom and total height, from the batter's own zone", () =>
	{
		const data = atBat.pitches.find((p) => p.pitchData)!.pitchData!;
		const starts: Record<string, number> = {};
		for (const side of ["R", "L"] as const)
		{
			wrap(<StrikeZoneChart pitches={atBat.pitches} selectedPitchNumber={null} onSelectPitch={() => undefined} batSide={side} />);
			const dims = screen.getByTestId("zone-measurements");
			for (const feet of [data.strikeZoneTop, data.strikeZoneBottom, data.strikeZoneTop - data.strikeZoneBottom])
			{
				expect(dims).toHaveTextContent(`${(feet * 12).toFixed(1)}"`);
			}
			expect(dims.querySelectorAll("line")).toHaveLength(4);
			starts[side] = Number(dims.querySelector("line")!.getAttribute("x1"));
			cleanup();
		}
		// A right-hander's dimensions run right of the zone (into the empty box), a left-hander's left.
		expect(starts.R).toBeGreaterThan(180);
		expect(starts.L).toBeLessThan(180);
	});

	it("puts a left-handed batter on the catcher's right, and a dot answers Enter", () =>
	{
		const onSelect = vi.fn();
		wrap(<StrikeZoneChart pitches={atBat.pitches} selectedPitchNumber={null} onSelectPitch={onSelect} batSide="L" />);
		expect(screen.getByRole("img", {
			name: "Left-handed batter",
		})).toHaveStyle({
			transform: "scaleX(-1)",
		});
		// A ball's number is dark on the green; a strike's or a ball in play's is light.
		for (const pitch of atBat.pitches.filter((p) => p.pitchData))
		{
			const number = within(screen.getByRole("button", {
				name: `Pitch ${pitch.pitchNumber}`,
			})).getByText(String(pitch.pitchNumber));
			expect(number).toHaveAttribute("fill", pitch.details.isBall && !pitch.details.isStrike && !pitch.details.isInPlay ? "var(--bt-dark)" : "var(--bt-light)");
		}
		const dot = screen.getAllByRole("button")[0]!;
		fireEvent.keyDown(dot, {
			key: "Tab",
		});
		expect(onSelect).not.toHaveBeenCalled();
		fireEvent.keyDown(dot, {
			key: "Enter",
		});
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it("replays the selected pitch in the zone in real time, then reports it landed", () =>
	{
		vi.useFakeTimers();
		let now = 0;
		vi.stubGlobal("requestAnimationFrame", (tick: FrameRequestCallback) => setTimeout(() =>
		{
			now += 100;
			tick(now);
		}, 0));
		vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
		vi.spyOn(performance, "now").mockReturnValue(0);
		const onEnd = vi.fn();
		const pitch = atBat.pitches.find((p) => p.pitchData)!;
		wrap(<StrikeZoneChart pitches={atBat.pitches} selectedPitchNumber={pitch.pitchNumber} onSelectPitch={() => undefined} playing onPlaybackEnd={onEnd} />);
		act(() =>
		{
			vi.advanceTimersToNextTimer();
		});
		// A tenth of a second in, the ball is in the air; its dot waits for it to land.
		expect(screen.getByTestId("zone-ball")).toBeInTheDocument();
		expect(screen.queryByRole("button", {
			name: `Pitch ${pitch.pitchNumber}`,
		})).toBeNull();
		expect(onEnd).not.toHaveBeenCalled();
		act(() =>
		{
			vi.runAllTimers();
		});
		expect(onEnd).toHaveBeenCalledOnce();
		vi.restoreAllMocks();
	});
});

describe("PlaysPanel", () =>
{
	it("opening an at-bat: the open one snaps shut, the tapped one scrolls to the top, then opens and replays each pitch in turn", () =>
	{
		vi.useFakeTimers();
		let now = 0;
		// One frame every 16 ms of timer time, each a tenth of a second of the replay.
		vi.stubGlobal("requestAnimationFrame", (tick: FrameRequestCallback) => setTimeout(() =>
		{
			now += 100;
			tick(now);
		}, 16));
		vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
		vi.spyOn(performance, "now").mockImplementation(() => now);
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		// The tapped at-bat sits 300px down the screen until it's scrolled to.
		let atTop = false;
		const scrolled: Element[] = [];
		vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element)
		{
			scrolled.push(this);
			atTop = true;
		});
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({
			top: atTop ? 0 : 300,
		}) as DOMRect);
		wrap(<PlaysPanel plays={PLAYS.slice(0, 3)} />);
		const first = document.getElementById(`at-bat-${PLAYS[0]!.about.atBatIndex}`)!;
		const second = PLAYS[1]!;
		const item = document.getElementById(`at-bat-${second.about.atBatIndex}`)!;
		expect(within(first).getByTestId("catcher-view")).toBeInTheDocument();
		const control = screen.getByRole("button", {
			name: new RegExp(second.matchup.batter.fullName),
		});
		fireEvent.click(control);
		// 1. The open one has shut, the tapped one held in place; 2. it scrolls up, not yet open.
		expect(within(first).queryByTestId("catcher-view")).toBeNull();
		expect(scrollBy).toHaveBeenCalledWith(0, 0);
		expect(scrolled).toEqual([item]);
		expect(within(item).queryByTestId("catcher-view")).toBeNull();
		// 3. The scroll ends: it opens, and once open its first pitch is thrown.
		act(() =>
		{
			window.dispatchEvent(new Event("scrollend"));
		});
		expect(within(item).getByTestId("catcher-view")).toBeInTheDocument();
		act(() =>
		{
			for (const panel of item.querySelectorAll(".mantine-Accordion-panel"))
			{
				for (const el of [panel, panel.parentElement!])
				{
					const event = new Event("transitionend", {
						bubbles: true,
					});
					Object.defineProperty(event, "propertyName", {
						value: "height",
					});
					el.dispatchEvent(event);
				}
			}
		});
		act(() =>
		{
			vi.advanceTimersByTime(16);
		});
		expect(within(item).getByTestId("zone-ball")).toBeInTheDocument();
		// No pitch wears the "current pitch" ring while the at-bat replays.
		expect(item.querySelector('circle[r="10"]')).toBeNull();
		const located = second.pitches.filter((p) => p.pitchData);
		// The side and top charts show the last pitch throughout, not the replay.
		const lastPitch = located.at(-1)!;
		expect(within(item).getByText(`#${lastPitch.pitchNumber} ${lastPitch.details.typeDescription}`)).toBeInTheDocument();
		// ...and the rest follow, overlapping in the air, until the last has landed
		// (each step's effects run between acts).
		let most = 0;
		for (let step = 0; step < 40; step++)
		{
			act(() =>
			{
				vi.advanceTimersByTime(16);
			});
			most = Math.max(most, within(item).queryAllByTestId("zone-ball").length);
		}
		expect(most).toBeGreaterThan(1);
		const last = within(item).getByRole("button", {
			name: `Pitch ${located.at(-1)!.pitchNumber}`,
		});
		expect(last).toHaveAttribute("aria-pressed", "true");
		// The last one gets the ring once it's over.
		expect(last.querySelector("circle")).toHaveAttribute("r", "10");

		// Closing it scrolls nothing.
		fireEvent.click(control);
		act(() =>
		{
			vi.runAllTimers();
		});
		expect(scrolled).toHaveLength(1);
		expect(within(item).queryByTestId("catcher-view")).toBeNull();
		vi.restoreAllMocks();
	});

	it("an at-bat already at the top opens straight away, and starts its replay even with no open animation to end", () =>
	{
		vi.useFakeTimers();
		vi.stubGlobal("scrollBy", vi.fn());
		const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
		wrap(<PlaysPanel plays={PLAYS.slice(0, 3)} />);
		const third = PLAYS[2]!;
		const item = document.getElementById(`at-bat-${third.about.atBatIndex}`)!;
		fireEvent.click(screen.getByRole("button", {
			name: new RegExp(third.matchup.batter.fullName),
		}));
		expect(scrolled).not.toHaveBeenCalled();
		expect(within(item).getByTestId("catcher-view")).toBeInTheDocument();
		// Its header now carries the matchup, inning, count and what happened, once.
		const header = within(item).getByRole("button", {
			name: new RegExp(third.matchup.batter.fullName),
		});
		expect(header).toHaveTextContent(`${third.matchup.batter.fullName} vs ${third.matchup.pitcher.fullName}`);
		expect(within(item).getAllByText(third.result.description)).toHaveLength(1);
		act(() =>
		{
			vi.advanceTimersByTime(600);
		});
		expect(within(item).getByTestId("zone-ball")).toBeInTheDocument();
		vi.restoreAllMocks();
	});

	it("a second tap before the scroll ends wins; opening again replays again", () =>
	{
		vi.useFakeTimers();
		vi.stubGlobal("scrollBy", vi.fn());
		let atTop = false;
		vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() =>
		{
			atTop = true;
		});
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({
			top: atTop ? 0 : 300,
		}) as DOMRect);
		wrap(<PlaysPanel plays={PLAYS.slice(0, 3)} />);
		const [, second, third] = [PLAYS[0]!, PLAYS[1]!, PLAYS[2]!];
		const item = (atBat: AtBat) => document.getElementById(`at-bat-${atBat.about.atBatIndex}`)!;
		const tap = (atBat: AtBat) => fireEvent.click(screen.getByRole("button", {
			name: new RegExp(`${atBat.matchup.batter.fullName} —`),
		}));
		tap(second);
		atTop = false;
		tap(third);
		act(() =>
		{
			window.dispatchEvent(new Event("scrollend"));
		});
		expect(within(item(second)).queryByTestId("catcher-view")).toBeNull();
		expect(within(item(third)).getByTestId("catcher-view")).toBeInTheDocument();
		act(() =>
		{
			vi.advanceTimersByTime(600);
		});
		expect(within(item(third)).getByTestId("zone-ball")).toBeInTheDocument();
		vi.restoreAllMocks();
	});
});

describe("AtBatViewer", () =>
{
	it("Animate pitch replays the selected pitch in the zone; tapping a pitch stops a replay of the at-bat", () =>
	{
		vi.useFakeTimers();
		const atBat = PLAYS.find((play) => play.pitches.filter((p) => p.pitchData).length >= 3)!;
		const { rerender } = wrap(<AtBatViewer atBat={atBat} />);
		fireEvent.click(screen.getByRole("button", {
			name: "Animate pitch",
		}));
		act(() =>
		{
			vi.advanceTimersByTime(20);
		});
		expect(screen.getByTestId("zone-ball")).toBeInTheDocument();
		act(() =>
		{
			vi.runAllTimers();
		});
		// Replay the at-bat, then stop it by choosing a pitch.
		rerender(<MantineProvider><AtBatViewer atBat={atBat} autoplay={1} /></MantineProvider>);
		const last = atBat.pitches.at(-1)!;
		fireEvent.click(screen.getByRole("button", {
			name: new RegExp(`^#${last.pitchNumber} `),
		}));
		act(() =>
		{
			vi.runAllTimers();
		});
		expect(screen.queryByTestId("zone-ball")).toBeNull();
		expect(screen.getByRole("button", {
			name: `Pitch ${last.pitchNumber}`,
		})).toHaveAttribute("aria-pressed", "true");
	});

	it("an at-bat with no pitches has nothing to animate", () =>
	{
		wrap(<AtBatViewer atBat={{
			...PLAYS[0]!,
			pitches: [],
		}} autoplay={1} />);
		expect(screen.getByRole("button", {
			name: "Animate pitch",
		})).toBeDisabled();
	});
});


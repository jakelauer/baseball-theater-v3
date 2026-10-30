import type { AtBat } from "@bt/domain";
import {
	Anchor, Box, Group, Paper, Stack, Text,
} from "@mantine/core";
import { useState } from "react";
import type { GamePayload } from "../../api/game.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { MatchupCards } from "../pitch/MatchupCards.js";
import { PitchSequence } from "../pitch/PitchSequence.js";
import type { TrajectoryChart } from "../pitch/PitchTrajectoryView.js";
import { PitchTrajectoryView } from "../pitch/PitchTrajectoryView.js";
import { StrikeZoneChart } from "../pitch/StrikeZoneChart.js";
import { outsLabel } from "./format.js";
import { LiveStatus } from "./LiveStatus.js";

/** The pitcher's and batter's surnames: "Gusto vs Bregman". */
function matchupTitle(atBat: AtBat): string
{
	const last = (name: string) => name.slice(name.lastIndexOf(" ") + 1);
	return `${last(atBat.matchup.pitcher.fullName)} vs ${last(atBat.matchup.batter.fullName)}`;
}

/** The two optional flight charts and the link that toggles each. */
const CHART_LINKS: { chart: TrajectoryChart;
	label: string }[] = [
	{
		chart: "side",
		label: "Side view",
	},
	{
		chart: "top",
		label: "Top view",
	},
];

/**
 * The catcher's view of the at-bat, with quiet links under it: one replays the
 * selected pitch in the zone, two show or hide the side and top-down flight charts of
 * the selected pitch (which have their own Animate button) — hidden by default (owner,
 * 2026-10-29: "only show the catcher's view. For now, put some subtle links to the top
 * and side views that toggle them (hidden by default)").
 */
function Theater({
	atBat, selected, onSelectPitch, arrivals,
}: { atBat: AtBat;
	selected: number | null;
	onSelectPitch: (pitchNumber: number) => void;
	/** Counts pitches that arrived while watching; each one replays in the zone. */
	arrivals: number; })
{
	const [charts, setCharts] = useState<TrajectoryChart[]>([]);
	// Replays the selected pitch in the zone, at the speed it looks from behind the plate.
	const [playing, setPlaying] = useState(false);
	const [seenArrivals, setSeenArrivals] = useState(arrivals);
	if (arrivals !== seenArrivals)
	{
		setSeenArrivals(arrivals);
		setPlaying(true);
	}
	const toggle = (chart: TrajectoryChart) => setCharts(charts.includes(chart) ? charts.filter((c) => c !== chart) : [...charts, chart]);
	return (
		<Stack gap={8} data-testid="live-zone">
			<StrikeZoneChart
				pitches={atBat.pitches}
				selectedPitchNumber={selected}
				onSelectPitch={onSelectPitch}
				batSide={atBat.matchup.batSide}
				pitchHand={atBat.matchup.pitchHand}
				playing={playing}
				onPlaybackEnd={() => setPlaying(false)}
			/>
			<Group gap={12} justify="center">
				<Anchor component="button" type="button" fz={12} c="var(--bt-muted)" disabled={selected === null} onClick={() => setPlaying(true)}>
					Animate pitch
				</Anchor>
				{CHART_LINKS.map(({ chart, label }) => (
					<Anchor
						key={chart}
						component="button"
						type="button"
						fz={12}
						c="var(--bt-muted)"
						aria-pressed={charts.includes(chart)}
						onClick={() => toggle(chart)}
					>
						{label}
					</Anchor>
				))}
			</Group>
			{charts.length > 0 ? (
				<PitchTrajectoryView
					pitch={atBat.pitches.find((pitch) => pitch.pitchNumber === selected) ?? null}
					batSide={atBat.matchup.batSide}
					pitchHand={atBat.matchup.pitchHand}
					charts={CHART_LINKS.flatMap(({ chart }) => (charts.includes(chart) ? [chart] : []))}
				/>
			) : null}
		</Stack>
	);
}

/**
 * The Live room (S3 status, S64 pitch theater; game-rooms `live-mobile` / `-medium` /
 * `-desktop`): the status with the base diamond, the pitcher and batter cards, the catcher's
 * view of each pitch's flight, and the pitch sequence of the at-bat in progress — the last play.
 * One pitch is selected at a time, newest by default; a zone dot and a sequence row
 * select the same one. Mobile stacks it all under the status row; medium / desktop put
 * the cards and zone on the left with the status card beside them and the sequence
 * below. No win-probability chart at launch (owner, 2026-10-19). A game with no plays
 * yet shows the status alone.
 */
export function LiveRoom({ game, variant }: { game: GamePayload;
	variant: LayoutVariant; })
{
	const atBat = game.plays.at(-1);
	const newest = atBat?.pitches.at(-1)?.pitchNumber ?? null;
	const [picked, setPicked] = useState<{ atBat: number;
		pitch: number } | null>(null);
	// A new pitch arriving live jumps to it and replays it in the zone (owner, 2026-10-29:
	// "when a new pitch is added during real time data it should animate"); the pitch
	// already there when the room opens doesn't replay.
	const latest = atBat && newest !== null ? `${atBat.about.atBatIndex}:${newest}` : null;
	const [seenLatest, setSeenLatest] = useState(latest);
	const [arrivals, setArrivals] = useState(0);
	if (latest !== seenLatest)
	{
		setSeenLatest(latest);
		if (latest !== null)
		{
			setPicked(null);
			setArrivals(arrivals + 1);
		}
	}
	// A new at-bat starts back at its newest pitch.
	const selected = picked && picked.atBat === atBat?.about.atBatIndex ? picked.pitch : newest;
	const status = <LiveStatus game={game} variant={variant} />;
	if (!atBat) return status;

	const select = (pitch: number) => setPicked({
		atBat: atBat.about.atBatIndex,
		pitch,
	});
	const cards = <MatchupCards plays={game.plays} atBat={atBat} />;
	const sequence = (
		<PitchSequence pitches={atBat.pitches} selectedPitchNumber={selected} onSelectPitch={select} variant={variant} />
	);

	if (variant === "mobile")
	{
		return (
			<Stack gap={16}>
				{status}
				<Box data-testid="matchup-line">
					<Group justify="space-between">
						<Text fz={15} fw={700}>{matchupTitle(atBat)}</Text>
						<Text fz={13} c="var(--bt-accent)">
							Count: {atBat.count.balls}-{atBat.count.strikes} · {outsLabel(atBat.count.outs)}
						</Text>
					</Group>
					{atBat.result.description ? <Text fz={13}>Result: {atBat.result.description}</Text> : null}
				</Box>
				{cards}
				<Theater atBat={atBat} selected={selected} onSelectPitch={select} arrivals={arrivals} />
				<Text fz={12} fw={700} tt="uppercase">Pitch sequence</Text>
				{sequence}
			</Stack>
		);
	}

	return (
		<Stack gap={16}>
			<Group align="flex-start" gap={16} wrap="nowrap" data-testid="live-top">
				<Stack gap={16} style={{
					flex: 1,
					minWidth: 0,
				}}
				>
					{cards}
					<Paper radius="md" p={12} style={{
						border: "1px solid var(--bt-light)",
					}}
					>
						<Theater atBat={atBat} selected={selected} onSelectPitch={select} arrivals={arrivals} />
					</Paper>
				</Stack>
				{status}
			</Group>
			{sequence}
		</Stack>
	);
}

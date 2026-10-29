import type { AtBat } from "@bt/domain";
import {
	Box, Group, Paper, Stack, Text,
} from "@mantine/core";
import { useState } from "react";
import type { GamePayload } from "../../api/game.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { MatchupCards } from "../pitch/MatchupCards.js";
import { PitchSequence } from "../pitch/PitchSequence.js";
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

/** The zone and the selected pitch's flight, side by side: the existing pitch components, reused. */
function Theater({
	atBat, selected, onSelectPitch,
}: { atBat: AtBat;
	selected: number | null;
	onSelectPitch: (pitchNumber: number) => void; })
{
	return (
		<Group align="flex-start" gap="lg" wrap="wrap" data-testid="live-zone">
			<StrikeZoneChart pitches={atBat.pitches} selectedPitchNumber={selected} onSelectPitch={onSelectPitch} />
			<PitchTrajectoryView pitch={atBat.pitches.find((pitch) => pitch.pitchNumber === selected) ?? null} playing={false} />
		</Group>
	);
}

/**
 * The Live room (S3 status, S64 pitch theater; game-rooms `live-mobile` / `-medium` /
 * `-desktop`): the status with the base diamond, the pitcher and batter cards, the zone
 * and trajectory, and the pitch sequence of the at-bat in progress — the last play.
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
				<Theater atBat={atBat} selected={selected} onSelectPitch={select} />
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
						<Theater atBat={atBat} selected={selected} onSelectPitch={select} />
					</Paper>
				</Stack>
				{status}
			</Group>
			{sequence}
		</Stack>
	);
}

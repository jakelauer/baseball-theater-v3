import type { AtBat } from "@bt/domain";
import {
	Button,
	Group,
	ScrollArea,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import {
	useEffect, useMemo, useState,
} from "react";
import { PitchTrajectoryView } from "./PitchTrajectoryView.js";
import { StrikeZoneChart } from "./StrikeZoneChart.js";

type Props = {
	atBat: AtBat;
	/** Changes each time the at-bat is opened and scrolled into place: replay every pitch then. */
	autoplay?: number;
};

export function AtBatViewer({ atBat, autoplay = 0 }: Props)
{
	const firstPitch = atBat.pitches[0]?.pitchNumber ?? null;
	const [selectedPitchNumber, setSelectedPitchNumber] = useState<number | null>(
		firstPitch,
	);
	const [playing, setPlaying] = useState(false);
	// Opening the at-bat replays every pitch in the zone, overlapping (owner, 2026-10-29:
	// "Opening an at bat should animate each pitch in quick succession, starting after the
	// top of screen animation is completed"; "should overlap a bit"). The last pitch is
	// selected straight away, so the side and top charts show it, not the replay ("those
	// should always show the selected / last pitch irrespective of the initial animation").
	const [replaying, setReplaying] = useState(false);
	const [seenAutoplay, setSeenAutoplay] = useState(autoplay);
	if (autoplay !== seenAutoplay)
	{
		setSeenAutoplay(autoplay);
		const last = atBat.pitches.filter((p) => p.pitchData).at(-1);
		if (last)
		{
			setSelectedPitchNumber(last.pitchNumber);
			setPlaying(false);
			setReplaying(true);
		}
	}
	// Choosing a pitch by hand stops a replay in progress.
	const choose = (pitchNumber: number) =>
	{
		setReplaying(false);
		setSelectedPitchNumber(pitchNumber);
		setPlaying(false);
	};

	useEffect(() =>
	{
		setSelectedPitchNumber(atBat.pitches[0]?.pitchNumber ?? null);
		setPlaying(false);
	}, [atBat.about.atBatIndex, atBat.pitches]);

	const selectedPitch = useMemo(
		() => atBat.pitches.find((p) => p.pitchNumber === selectedPitchNumber) ?? null,
		[atBat.pitches, selectedPitchNumber],
	);

	return (
		<Stack gap="md">

			<Group align="flex-start" gap="xl" wrap="wrap">
				<StrikeZoneChart
					pitches={atBat.pitches}
					batSide={atBat.matchup.batSide}
					pitchHand={atBat.matchup.pitchHand}
					playing={playing}
					onPlaybackEnd={() => setPlaying(false)}
					replayingAll={replaying}
					onReplayAllEnd={() => setReplaying(false)}
					selectedPitchNumber={selectedPitchNumber}
					onSelectPitch={choose}
				/>

				<Stack gap="sm" style={{
					flex: 1,
					minWidth: 300,
				}}>
					<Group gap="xs">
						<Button
							size="xs"
							variant="light"
							disabled={!selectedPitch}
							onClick={() =>
							{
								setReplaying(false);
								setPlaying(true);
							}}
						>
							Animate pitch
						</Button>
						{selectedPitch ? (
							<Text size="sm" c="dimmed">
								{selectedPitch.details.callDescription}
							</Text>
						) : null}
					</Group>
					<PitchTrajectoryView
						pitch={selectedPitch}
						batSide={atBat.matchup.batSide}
						pitchHand={atBat.matchup.pitchHand}
					/>
				</Stack>
			</Group>

			<ScrollArea.Autosize mah={160}>
				<Group gap="xs">
					{atBat.pitches.map((pitch) =>
					{
						const active = pitch.pitchNumber === selectedPitchNumber;
						return (
							<UnstyledButton
								key={pitch.playId}
								onClick={() => choose(pitch.pitchNumber)}
								style={{
									border: active
										? "1px solid var(--mantine-color-blue-5)"
										: "1px solid var(--mantine-color-dark-4)",
									borderRadius: 8,
									padding: "6px 10px",
									background: active ? "var(--mantine-color-dark-5)" : "transparent",
								}}
							>
								<Text size="sm" fw={active ? 700 : 500}>
									#{pitch.pitchNumber} {pitch.details.type ?? "?"}
								</Text>
								<Text size="xs" c="dimmed">
									{pitch.details.callDescription ?? pitch.details.call}
								</Text>
							</UnstyledButton>
						);
					})}
				</Group>
			</ScrollArea.Autosize>
		</Stack>
	);
}

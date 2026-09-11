import type { PitchEvent } from "@bt/domain";
import {
	Box, Text, Tooltip,
} from "@mantine/core";
import { pitchDotColor, pitchZonePct } from "./utils.js";

type Props = {
	pitches: PitchEvent[];
	selectedPitchNumber: number | null;
	onSelectPitch: (pitchNumber: number) => void;
};

export function StrikeZoneChart({
	pitches, selectedPitchNumber, onSelectPitch,
}: Props)
{
	const withLocation = pitches
		.map((pitch) => ({
			pitch,
			pct: pitchZonePct(pitch),
		}))
		.filter(
			(p): p is { pitch: PitchEvent;
				pct: { left: number;
					bottom: number } } => !!p.pct,
		);

	return (
		<Box>
			<Text size="sm" c="dimmed" mb="xs">
				Catcher&apos;s view · click a pitch
			</Text>
			<Box
				pos="relative"
				w={220}
				h={280}
				style={{
					border: "1px solid var(--mantine-color-dark-4)",
					borderRadius: 8,
					background:
            "linear-gradient(180deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-6) 100%)",
				}}
			>
				<Box
					pos="absolute"
					left="12%"
					right="12%"
					bottom="18%"
					top="10%"
					style={{
						border: "2px solid rgba(255,255,255,0.35)",
						borderRadius: 2,
					}}
				/>
				<Box
					pos="absolute"
					left="50%"
					bottom="6%"
					w={48}
					h={4}
					ml={-24}
					style={{
						background: "rgba(255,255,255,0.5)",
						transform: "perspective(40px) rotateX(55deg)",
					}}
				/>
				{withLocation.map(({ pitch, pct }) =>
				{
					const selected = pitch.pitchNumber === selectedPitchNumber;
					return (
						<Tooltip
							key={pitch.playId}
							label={
								<>
									#{pitch.pitchNumber}{" "}
									{pitch.details.typeDescription ?? pitch.details.type}
									<br />
									{pitch.details.callDescription ?? pitch.details.call}
									{pitch.pitchData ? (
										<>
											<br />
											{pitch.pitchData.startSpeed.toFixed(1)} mph
										</>
									) : null}
								</>
							}
						>
							<Box
								component="button"
								type="button"
								aria-label={`Pitch ${pitch.pitchNumber}`}
								onClick={() => onSelectPitch(pitch.pitchNumber)}
								pos="absolute"
								w={selected ? 22 : 18}
								h={selected ? 22 : 18}
								left={`${pct.left * 76 + 12}%`}
								bottom={`${pct.bottom * 72 + 18}%`}
								ml={selected ? -11 : -9}
								mb={selected ? -11 : -9}
								style={{
									borderRadius: "50%",
									border: selected ? "2px solid white" : "1px solid rgba(0,0,0,0.4)",
									background: pitchDotColor(pitch),
									cursor: "pointer",
									boxShadow: selected ? "0 0 8px rgba(255,255,255,0.6)" : undefined,
									zIndex: pitch.pitchNumber,
								}}
							>
								<Text
									span
									size="xs"
									fw={700}
									c="white"
									style={{
										fontSize: 10,
										lineHeight: 1,
									}}
								>
									{pitch.pitchNumber}
								</Text>
							</Box>
						</Tooltip>
					);
				})}
			</Box>
		</Box>
	);
}

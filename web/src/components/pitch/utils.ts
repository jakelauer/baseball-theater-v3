import type {
	PitchData, PitchEvent, PitchOutcome,
} from "@bt/domain";
import { pitchOutcome, plateToStrikeZonePct } from "@bt/domain";

/** Theme role per pitch outcome — the pitch tokens in `styles.css` (VISUAL-DESIGN §3). */
const PITCH_OUTCOME_COLOR: Record<PitchOutcome, string> = {
	ball: "var(--bt-pitch-ball)",
	strike: "var(--bt-pitch-strike)",
	inPlay: "var(--bt-pitch-in-play)",
};

/** Dot color for a pitch. The outcome is decided once in `@bt/domain`; this only picks the token. */
export function pitchDotColor(pitch: PitchEvent): string
{
	return PITCH_OUTCOME_COLOR[pitchOutcome(pitch)];
}

/**
 * A speed as shown everywhere a pitch appears — zone tooltip, trajectory header, pitch
 * sequence — "98.1 mph" (S64; one format, ADR-025).
 */
export function speedLabel(mph: number): string
{
	return `${mph.toFixed(1)} mph`;
}

export function pitchZonePct(pitch: PitchEvent): { left: number;
	bottom: number } | null
{
	const data = pitch.pitchData;
	if (!data) return null;
	return plateToStrikeZonePct(
		{
			pX: data.coordinates.pX,
			pZ: data.coordinates.pZ,
		},
		{
			top: data.strikeZoneTop,
			bottom: data.strikeZoneBottom,
		},
		{
			padHorizontalFt: 0.6,
			padVerticalFt: 0.4,
		},
	);
}

export function kinematicsFromPitch(data: PitchData)
{
	const c = data.coordinates;
	return {
		x0: c.x0,
		y0: c.y0,
		z0: c.z0,
		vx0: c.vx0,
		vy0: c.vy0,
		vz0: c.vz0,
		ax: c.ax,
		ay: c.ay,
		az: c.az,
	};
}

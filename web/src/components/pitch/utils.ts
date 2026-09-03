import type { PitchData, PitchEvent } from "@bt/domain";
import { plateToStrikeZonePct } from "@bt/domain";

export function pitchDotColor(pitch: PitchEvent): string {
  if (pitch.details.ballColor) return pitch.details.ballColor;
  if (pitch.details.isBall) return "var(--mantine-color-green-6)";
  if (pitch.details.isStrike) return "var(--mantine-color-red-6)";
  return "var(--mantine-color-gray-6)";
}

export function pitchZonePct(pitch: PitchEvent): { left: number; bottom: number } | null {
  const data = pitch.pitchData;
  if (!data) return null;
  return plateToStrikeZonePct(
    { pX: data.coordinates.pX, pZ: data.coordinates.pZ },
    { top: data.strikeZoneTop, bottom: data.strikeZoneBottom },
    { padHorizontalFt: 0.6, padVerticalFt: 0.4 },
  );
}

export function kinematicsFromPitch(data: PitchData) {
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

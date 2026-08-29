/** Home plate half-width in feet (17\" / 2). */
export const PLATE_HALF_WIDTH_FT = 17 / 2 / 12;

export type PlatePoint = {
  pX: number;
  pZ: number;
};

export type StrikeZoneBounds = {
  top: number;
  bottom: number;
};

/**
 * Map Statcast/Gameday plate feet (catcher POV) into a strike-zone box as percentages.
 * Values outside [0, 1] are valid (pitch outside the zone).
 */
export function plateToStrikeZonePct(
  point: PlatePoint,
  zone: StrikeZoneBounds,
  opts?: { padHorizontalFt?: number; padVerticalFt?: number },
): { left: number; bottom: number } {
  const hPad = opts?.padHorizontalFt ?? 0;
  const vPad = opts?.padVerticalFt ?? 0;
  const halfW = PLATE_HALF_WIDTH_FT + hPad;
  const height = zone.top + vPad - (zone.bottom - vPad);
  if (height <= 0 || halfW <= 0) {
    throw new Error("Invalid strike zone dimensions");
  }
  return {
    left: (point.pX / halfW + 1) / 2,
    bottom: (point.pZ - (zone.bottom - vPad)) / height,
  };
}

/**
 * Constant-acceleration pitch position (feet, catcher POV).
 * y ≈ 50 at release; plate is y ≈ 0.
 */
export function pitchPositionAt(
  t: number,
  init: {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    ax: number;
    ay: number;
    az: number;
  },
): { x: number; y: number; z: number } {
  return {
    x: init.x0 + init.vx0 * t + 0.5 * init.ax * t * t,
    y: init.y0 + init.vy0 * t + 0.5 * init.ay * t * t,
    z: init.z0 + init.vz0 * t + 0.5 * init.az * t * t,
  };
}

/** Earliest non-negative time when y(t) = yTarget (default front of plate). */
export function timeToPlate(
  init: {
    y0: number;
    vy0: number;
    ay: number;
  },
  yTarget = 0,
): number | null {
  const a = 0.5 * init.ay;
  const b = init.vy0;
  const c = init.y0 - yTarget;
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return null;
    const t = -c / b;
    return t >= 0 ? t : null;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t1 = (-b - sqrt) / (2 * a);
  const t2 = (-b + sqrt) / (2 * a);
  const candidates = [t1, t2].filter((t) => t >= 0);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

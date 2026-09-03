import { describe, expect, it } from "vitest";
import {
  PLATE_HALF_WIDTH_FT,
  plateToStrikeZonePct,
  pitchPositionAt,
  sampleBattedBallTrajectory,
  samplePitchTrajectory,
  timeToPlate,
} from "./coordinates.js";

describe("plateToStrikeZonePct", () => {
  it("maps plate center and zone bottom to mid-left origin of box", () => {
    const pct = plateToStrikeZonePct({ pX: 0, pZ: 1.5 }, { top: 3.5, bottom: 1.5 });
    expect(pct.left).toBeCloseTo(0.5);
    expect(pct.bottom).toBeCloseTo(0);
  });

  it("maps plate edges near 0 and 1 horizontally", () => {
    const left = plateToStrikeZonePct(
      { pX: -PLATE_HALF_WIDTH_FT, pZ: 2.5 },
      { top: 3.5, bottom: 1.5 },
    );
    const right = plateToStrikeZonePct(
      { pX: PLATE_HALF_WIDTH_FT, pZ: 2.5 },
      { top: 3.5, bottom: 1.5 },
    );
    expect(left.left).toBeCloseTo(0);
    expect(right.left).toBeCloseTo(1);
  });

  it("allows values outside the zone box", () => {
    const pct = plateToStrikeZonePct({ pX: 0.38, pZ: 3.87 }, { top: 3.47, bottom: 1.65 });
    expect(pct.bottom).toBeGreaterThan(1);
  });
});

describe("pitch kinematics", () => {
  it("computes time to plate and position", () => {
    const init = {
      x0: -1.5,
      y0: 50,
      z0: 6,
      vx0: 2,
      vy0: -130,
      vz0: -4,
      ax: -5,
      ay: 30,
      az: -15,
    };
    const t = timeToPlate(init);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0);
    expect(t!).toBeLessThan(1);
    const atPlate = pitchPositionAt(t!, init);
    expect(atPlate.y).toBeCloseTo(0, 0);
  });

  it("samples pitch trajectory to plate", () => {
    const init = {
      x0: -2.2,
      y0: 50,
      z0: 5.6,
      vx0: 6.8,
      vy0: -138.4,
      vz0: -4.3,
      ax: -14.2,
      ay: 28.3,
      az: -16.2,
    };
    const path = samplePitchTrajectory(init);
    expect(path.length).toBeGreaterThan(10);
    expect(path[0]!.y).toBeCloseTo(50, 0);
    expect(path[path.length - 1]!.y).toBeLessThan(path[0]!.y);
  });

  it("samples batted ball arc", () => {
    const path = sampleBattedBallTrajectory({
      launchSpeed: 105,
      launchAngle: 28,
      totalDistance: 410,
    });
    expect(path.length).toBeGreaterThan(5);
    expect(path[0]!.z).toBeCloseTo(0, 0);
    expect(path.some((p) => p.z > 20)).toBe(true);
  });
});

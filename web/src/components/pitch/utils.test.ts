import { describe, expect, it } from "vitest";
import type { PitchEvent } from "@bt/domain";
import { pitchDotColor, pitchZonePct } from "./utils";

const samplePitch: PitchEvent = {
  pitchNumber: 1,
  playId: "test",
  startTime: "2024-07-04T15:05:22.370Z",
  details: {
    call: "C",
    callDescription: "Called Strike",
    type: "FF",
    typeDescription: "Four-Seam Fastball",
    isBall: false,
    isStrike: true,
    isInPlay: false,
    ballColor: "rgba(170, 21, 11, 1.0)",
  },
  count: { balls: 0, strikes: 1, outs: 0 },
  pitchData: {
    startSpeed: 95.1,
    endSpeed: 87.6,
    strikeZoneTop: 3.38,
    strikeZoneBottom: 1.5,
    zone: 1,
    plateTime: 0.39,
    extension: 7.1,
    coordinates: {
      pX: -0.65,
      pZ: 3.01,
      x0: -2.2,
      y0: 50,
      z0: 5.66,
      vx0: 6.8,
      vy0: -138.4,
      vz0: -4.3,
      ax: -14.2,
      ay: 28.3,
      az: -16.2,
      pfxX: -7.2,
      pfxZ: 8.2,
    },
    breaks: { breakAngle: 37, breakLength: 4.8, spinRate: 2369 },
  },
  hitData: null,
};

describe("pitch utils", () => {
  it("maps plate location into strike zone percentages", () => {
    const pct = pitchZonePct(samplePitch);
    expect(pct).not.toBeNull();
    expect(pct!.left).toBeGreaterThan(0);
    expect(pct!.bottom).toBeGreaterThan(0);
  });

  it("uses MLB ball color when present", () => {
    expect(pitchDotColor(samplePitch)).toBe("rgba(170, 21, 11, 1.0)");
  });
});

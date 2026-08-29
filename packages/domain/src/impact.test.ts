import { describe, expect, it } from "vitest";
import { rankHighlightsByImpact } from "./impact.js";
import { isGameInActiveWindow, isLiveStatus } from "./window.js";
import type { MediaHighlight } from "./types.js";

describe("rankHighlightsByImpact", () => {
  it("ranks walk-offs and HRs above filler", () => {
    const highlights: MediaHighlight[] = [
      {
        id: "1",
        playId: null,
        title: "Batter steps in",
        blurb: null,
        duration: null,
        imageUrl: null,
        playbackUrl: null,
      },
      {
        id: "2",
        playId: "p2",
        title: "Walk-off home run!",
        blurb: "Go-ahead blast",
        duration: null,
        imageUrl: null,
        playbackUrl: null,
      },
    ];
    const ranked = rankHighlightsByImpact(highlights);
    expect(ranked[0]?.id).toBe("2");
  });
});

describe("window", () => {
  it("treats live games as in window", () => {
    expect(isLiveStatus("I")).toBe(true);
    const now = new Date("2024-07-04T20:00:00.000Z");
    expect(
      isGameInActiveWindow(
        {
          officialDate: "2024-07-04",
          status: {
            abstractGameState: "Live",
            codedGameState: "I",
            detailedState: "In Progress",
          },
        },
        now,
      ),
    ).toBe(true);
  });
});

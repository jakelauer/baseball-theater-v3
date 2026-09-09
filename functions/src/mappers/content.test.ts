import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseGameContentResponse } from "@bt/mlb-api";
import { describe, expect, it } from "vitest";
import { mapContentHighlights, mapRecapBlurb, pickPlaybackUrl } from "./content.js";

const content = parseGameContentResponse(
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../fixtures/raw/content-823823.json", import.meta.url),
      ),
      "utf8",
    ),
  ),
);

describe("mapContentHighlights", () => {
  const highlights = mapContentHighlights(content);

  it("maps the fixture's highlight reel", () => {
    expect(highlights.length).toBeGreaterThan(0);
  });

  it("gives every highlight an id, a title and a playback url", () => {
    for (const highlight of highlights) {
      expect(highlight.id).toBeTruthy();
      expect(highlight.title).toBeTruthy();
      expect(highlight.playbackUrl).toBeTruthy();
    }
  });
});

describe("pickPlaybackUrl", () => {
  it("prefers the highest-fidelity mp4 over the hls stream", () => {
    const url = pickPlaybackUrl({
      id: "x",
      title: "t",
      blurb: "b",
      playbacks: [
        { name: "hlsCloud", url: "https://example.test/stream.m3u8" },
        { name: "mp4Avc", url: "https://example.test/video.mp4" },
      ],
    });

    expect(url).toBe("https://example.test/video.mp4");
  });

  it("falls back to hls when no mp4 is offered", () => {
    const url = pickPlaybackUrl({
      id: "x",
      title: "t",
      blurb: "b",
      playbacks: [{ name: "hlsCloud", url: "https://example.test/stream.m3u8" }],
    });

    expect(url).toBe("https://example.test/stream.m3u8");
  });
});

describe("mapRecapBlurb", () => {
  it("returns the editorial recap blurb when the fixture carries one", () => {
    const blurb = mapRecapBlurb(content);
    expect(blurb === null || blurb.length > 0).toBe(true);
  });

  it("returns null when there is no editorial block", () => {
    expect(mapRecapBlurb({})).toBeNull();
  });
});

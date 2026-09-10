import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseGameDiffPatchResponse,
  parseRecordedReplayWalk,
  reconstructReplay,
  type ReplayPatchEntry,
} from "./replay.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function readRaw(name: string): unknown {
  return JSON.parse(readFileSync(rawDir + name, "utf8"));
}

describe("parseGameDiffPatchResponse", () => {
  it("accepts the one-element wrapper MLB returns and rejects a bare op list", () => {
    const ok = parseGameDiffPatchResponse([
      { diff: [{ op: "replace", path: "/a", value: 1 }] },
    ]);
    expect(ok[0]?.diff[0]?.op).toBe("replace");
    expect(() =>
      parseGameDiffPatchResponse([{ op: "replace", path: "/a", value: 1 }]),
    ).toThrow();
  });
});

describe("parseRecordedReplayWalk", () => {
  it("parses the recorded 553-step walk with its start/end timecodes and diffs", () => {
    const walk = parseRecordedReplayWalk(readRaw("diffpatch-823823.json"));
    expect(walk).toHaveLength(553);
    expect(walk[0]?.startTimecode).toMatch(/^\d{8}_\d{6}$/);
    expect(walk[0]?.endTimecode).toMatch(/^\d{8}_\d{6}$/);
    expect(walk.some((entry) => entry.rebased === true)).toBe(true);
    expect(walk.some((entry) => entry.diff.length === 0)).toBe(true);
  });

  it("throws when a step is missing its timecodes", () => {
    expect(() => parseRecordedReplayWalk([{ diff: [] }])).toThrow();
  });
});

describe("reconstructReplay", () => {
  const base = { root: { items: [{ id: "a" }], note: "start" }, spare: "x" };
  const walk: ReplayPatchEntry[] = [
    { startTimecode: "t0", endTimecode: "t1", diff: [] },
    {
      startTimecode: "t1",
      endTimecode: "t2",
      diff: [
        { op: "add", path: "/root/items/-", value: { id: "b" } },
        { op: "replace", path: "/root/note", value: "mid" },
      ],
    },
    {
      startTimecode: "t2",
      endTimecode: "t3",
      diff: [
        { op: "copy", from: "/spare", path: "/root/copied" },
        { op: "move", from: "/root/note", path: "/root/moved" },
        { op: "remove", path: "/root/items/0" },
      ],
    },
  ];

  it("collapses empty-diff steps and exposes the retained timecodes", () => {
    const out = reconstructReplay(base, walk);
    expect(out.timecodes).toEqual(["t2", "t3"]);
    expect(out.states).toHaveLength(2);
  });

  it("applies add / replace / copy / move / remove as an RFC6902 fold", () => {
    const { states } = reconstructReplay(base, walk);
    expect(states[0]?.feed).toMatchObject({
      root: { items: [{ id: "a" }, { id: "b" }], note: "mid" },
    });
    expect(states[1]?.feed).toMatchObject({
      root: { items: [{ id: "b" }], copied: "x", moved: "mid" },
    });
    // The base object is never mutated.
    expect(base.root.items).toHaveLength(1);
    expect(base.root.note).toBe("start");
  });
});

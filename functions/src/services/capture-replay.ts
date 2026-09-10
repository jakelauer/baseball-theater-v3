/**
 * Post-game replay capture.
 *
 * Run once, after a game is final: fetch the timecode list, walk the adjacent
 * pairs through `/feed/live/diffPatch`, collapse the idle steps, and persist a
 * single replay artifact. From then on the game replays from that artifact plus
 * the base feed — no live pipeline, no per-viewer MLB egress (ADR-002).
 *
 * This module only orchestrates the port and the repository; the RFC6902 fold
 * that rebuilds feed state is `@bt/mlb-api`'s `reconstructReplay`.
 */
import type { MlbStatsClient } from "@bt/ports";
import type { ReplayPatchEntry } from "@bt/mlb-api";
import type { ReplayArtifact, ReplayArtifactRepository } from "./replay-store.js";

export interface CaptureReplayDeps {
  mlb: MlbStatsClient;
  replays: ReplayArtifactRepository;
}

export async function captureReplay(
  deps: CaptureReplayDeps,
  gamePk: number,
): Promise<ReplayArtifact> {
  const timecodes = await deps.mlb.fetchGameTimestamps(gamePk);
  if (timecodes.length < 2) {
    throw new Error(
      `game ${gamePk} has ${timecodes.length} timecodes; need at least 2 to walk`,
    );
  }

  const patches: ReplayPatchEntry[] = [];
  for (let i = 0; i < timecodes.length - 1; i += 1) {
    const startTimecode = timecodes[i]!;
    const endTimecode = timecodes[i + 1]!;
    const response = await deps.mlb.fetchGameDiffPatch(
      gamePk,
      startTimecode,
      endTimecode,
    );
    const diff = response[0]?.diff ?? [];
    if (diff.length === 0) continue; // idle step — nothing changed between these timecodes
    patches.push({ startTimecode, endTimecode, diff });
  }

  const artifact: ReplayArtifact = {
    gamePk,
    baseTimecode: timecodes[0]!,
    timecodes: patches.map((patch) => patch.endTimecode),
    patches,
  };
  await deps.replays.upsert(artifact);
  return artifact;
}

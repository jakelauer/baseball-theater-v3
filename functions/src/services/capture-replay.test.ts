import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseLiveFeedResponse, reconstructReplay } from "@bt/mlb-api";
import {
	describe, expect, it,
} from "vitest";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import { InMemoryReplayArtifactRepository } from "../adapters/memory/repos.js";
import { mapLiveFeed } from "../mappers/live.js";
import { captureReplay } from "./capture-replay.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

describe("captureReplay", () =>
{
	it("persists one artifact that round-trips to the same reconstructed final state", async () =>
	{
		const mlb = new FixtureMlbStatsClient();
		const replays = new InMemoryReplayArtifactRepository();

		const artifact = await captureReplay({
			mlb,
			replays,
		}, 823823);

		// Exactly one artifact, stored and retrievable.
		expect(await replays.getByPk(823823)).toEqual(artifact);
		expect(artifact.gamePk).toBe(823823);
		expect(artifact.patches.length).toBeGreaterThanOrEqual(1);
		expect(artifact.patches.length).toBeLessThan(553);
		expect(artifact.timecodes).toHaveLength(artifact.patches.length);

		const timecodes = await mlb.fetchGameTimestamps(823823);
		expect(artifact.baseTimecode).toBe(timecodes[0]);

		// The stored patch chain rebuilds the same final GameSnapshot as replay.test.ts.
		const base = JSON.parse(readFileSync(rawDir + "live-823823-base.json", "utf8"));
		const { states } = reconstructReplay(base, artifact.patches);
		const snapshot = mapLiveFeed(
			parseLiveFeedResponse(states[states.length - 1]!.feed),
			"2026-09-06T00:00:00.000Z",
		);
		expect(snapshot.linescore?.teams.away.runs).toBe(6);
		expect(snapshot.linescore?.teams.home.runs).toBe(5);
		// Folds the whole committed diffPatch corpus: ~1.2s locally but ~5.8s on a CI
		// runner, which tipped over Vitest's 5s default and failed the S25 push.
	}, 30_000);

	it("throws rather than persisting when a game has too few timecodes", async () =>
	{
		const replays = new InMemoryReplayArtifactRepository();
		const mlb = new FixtureMlbStatsClient();
		await expect(captureReplay({
			mlb,
			replays,
		}, 999999)).rejects.toThrow();
		expect(await replays.getByPk(999999)).toBeNull();
	});
});

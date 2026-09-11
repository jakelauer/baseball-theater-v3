/**
 * `pnpm --filter @bt/functions capture-replay <gamePk>`
 *
 * Walks a **finished** game's timecode diff log once and stores a replay
 * artifact. This is the only path that reaches `statsapi.mlb.com` — it is never
 * run by `pnpm verify` or CI (which stay on `FixtureMlbStatsClient`). Run it
 * after the game is final; allow a grace window for post-game stat revisions.
 *
 * The artifact goes to an in-memory repository here — a durable adapter
 * (Cloud Storage / Firestore subcollection) is later wiring (S22 open question).
 */
import { HttpMlbStatsClient } from "../adapters/http/mlb.js";
import { InMemoryReplayArtifactRepository } from "../adapters/memory/repos.js";
import { captureReplay } from "../services/capture-replay.js";

const gamePk = Number(process.argv[2]);
if (!Number.isInteger(gamePk) || gamePk <= 0)
{
	console.error("usage: pnpm --filter @bt/functions capture-replay <gamePk>");
	process.exit(1);
}

const replays = new InMemoryReplayArtifactRepository();
const artifact = await captureReplay({
	mlb: new HttpMlbStatsClient(),
	replays,
}, gamePk);

console.log(
	`[capture-replay] game ${gamePk}: ${artifact.patches.length} retained patches ` +
    `over ${artifact.timecodes.length} timecodes, base ${artifact.baseTimecode}`,
);

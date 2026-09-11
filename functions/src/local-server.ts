import { createServer } from "node:http";
import { DEFAULT_CADENCE } from "@bt/domain";
import type {
	GameRepository, MlbStatsClient, ScheduleRepository,
} from "@bt/ports";
import { FixtureMlbStatsClient } from "./adapters/fixtures/mlb.js";
import {
	FirestoreGameRepository,
	FirestoreScheduleRepository,
} from "./adapters/firestore/repos.js";
import { HttpMlbStatsClient } from "./adapters/http/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
} from "./adapters/memory/repos.js";
import { handleApiRequest } from "./handlers/api.js";
import { ingestScheduleDay, tickIngest } from "./services/ingest.js";
import { RefreshCoordinator } from "./services/refresh.js";

const PORT = Number(process.env.BT_API_PORT ?? 8787);
const DEFAULT_DATE = process.env.BT_SEED_DATE ?? "2024-07-04";

/**
 * Fixtures are the default so local dev and CI never touch the network.
 * Set `BT_USE_LIVE_MLB=1` to hit the real Stats API instead.
 */
function createMlbClient(): MlbStatsClient
{
	if (process.env.BT_USE_LIVE_MLB === "1")
	{
		console.log("[bt-api] BT_USE_LIVE_MLB=1 — using live statsapi.mlb.com");
		return new HttpMlbStatsClient();
	}
	return new FixtureMlbStatsClient();
}

/**
 * In-memory repos are the default so local dev and CI need no cloud. Set
 * `BT_USE_FIRESTORE=1` (with `FIRESTORE_EMULATOR_HOST` for the emulator) to put
 * schedule/game reads on Firestore instead.
 */
function createSnapshotRepos(): {
	schedules: ScheduleRepository;
	games: GameRepository;
}
{
	if (process.env.BT_USE_FIRESTORE === "1")
	{
		console.log("[bt-api] BT_USE_FIRESTORE=1 — schedule/game reads go to Firestore");
		return {
			schedules: new FirestoreScheduleRepository(),
			games: new FirestoreGameRepository(),
		};
	}
	return {
		schedules: new InMemoryScheduleRepository(),
		games: new InMemoryGameRepository(),
	};
}

async function main(): Promise<void>
{
	const { schedules, games } = createSnapshotRepos();
	const projections = new InMemoryGameProjectionRepository();
	const mlb = createMlbClient();
	// One coordinator for the process: out-of-window reads that go stale trigger a
	// single-flighted, cooldown-gated refresh instead of one MLB pull per request.
	const refresh = new RefreshCoordinator();
	const ingest = {
		mlb,
		schedules,
		games,
		projections,
		refresh,
	};

	await ingestScheduleDay(ingest, DEFAULT_DATE);
	console.log(`[bt-api] Seeded fixtures for ${DEFAULT_DATE}`);

	const server = createServer((req, res) =>
	{
		void handleApiRequest(req, res, {
			ingest,
		}).catch((err: unknown) =>
		{
			console.error(err);
			res.writeHead(500, {
				"Content-Type": "application/json",
			});
			res.end(JSON.stringify({
				error: "internal",
			}));
		});
	});

	// ADR-002 cadence loop. Off by default: `pnpm dev` stays a single fixture seed
	// unless BT_INGEST_TICK=1, so local work never spins an unattended poll.
	if (process.env.BT_INGEST_TICK === "1")
	{
		console.log(
			`[bt-api] BT_INGEST_TICK=1 — ticking active-window ingest every ${DEFAULT_CADENCE.intervalMs}ms`,
		);
		setInterval(() =>
		{
			void tickIngest(ingest).then(
				(r) =>
				{
					if (r.ingested.length > 0)
					{
						console.log(`[bt-api] tick ingested ${r.ingested.join(", ")}`);
					}
				},
				(err: unknown) => console.error("[bt-api] tick failed", err),
			);
		}, DEFAULT_CADENCE.intervalMs);
	}

	server.listen(PORT, () =>
	{
		console.log(`[bt-api] Listening on http://localhost:${PORT}`);
		console.log(`[bt-api] GET /api/schedule?date=${DEFAULT_DATE}`);
		console.log("[bt-api] GET /api/games/744834");
	});
}

void main();

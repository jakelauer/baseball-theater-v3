import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { DEFAULT_CADENCE } from "@bt/domain";
import type {
	GameRepository, MlbStatsClient, ScheduleRepository,
} from "@bt/ports";
import {
	createDevAccountData, createDevAuth, StaticSecretsProvider,
} from "./adapters/fixtures/auth.js";
import { FixtureMlbStatsClient } from "./adapters/fixtures/mlb.js";
import { HttpMlbStatsClient } from "./adapters/http/mlb.js";
import { toNodeListener } from "./adapters/node/http.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
} from "./adapters/memory/repos.js";
import { handleApiRequest } from "./handlers/api.js";
import { ingestScheduleDay, tickIngest } from "./services/ingest.js";
import { RefreshCoordinator } from "./services/refresh.js";
import { SESSION_KEY_SECRET } from "./services/session.js";

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
 * In-memory repos so local dev and CI need no cloud. The durable store is
 * Postgres behind these same ports (ADR-018; S50 adds the adapter).
 */
function createSnapshotRepos(): {
	schedules: ScheduleRepository;
	games: GameRepository;
}
{
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

	// Local sign-in is `Authorization: Bearer dev:<uid>`. Without BT_SESSION_KEY the key is
	// random per process, so issued sessions simply stop verifying after a restart.
	const secrets = new StaticSecretsProvider({
		[SESSION_KEY_SECRET]: process.env[SESSION_KEY_SECRET] ?? randomUUID(),
	});
	const auth = createDevAuth(secrets);
	// Export and deletion (ADR-028) over the same users, with the dev identity admin.
	const account = createDevAccountData(auth.users, secrets);

	// The Fetch-standard handler the Worker will run (ADR-017), served through Node's http.
	const server = createServer(toNodeListener((request) => handleApiRequest(request, {
		ingest,
		auth,
		account,
	})));

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
		console.log(`[bt-api] GET /api/v1/schedule?date=${DEFAULT_DATE}`);
		console.log("[bt-api] GET /api/v1/games/744834");
		console.log("[bt-api] GET /api/v1/me  (Authorization: Bearer dev:<uid>)");
	});
}

void main();

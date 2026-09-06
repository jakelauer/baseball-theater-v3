import { createServer } from "node:http";
import type { MlbStatsClient } from "@bt/ports";
import { FixtureMlbStatsClient } from "./adapters/fixtures/mlb.js";
import { HttpMlbStatsClient } from "./adapters/http/mlb.js";
import {
  InMemoryGameRepository,
  InMemoryScheduleRepository,
} from "./adapters/memory/repos.js";
import { handleApiRequest } from "./handlers/api.js";
import { ingestScheduleDay } from "./services/ingest.js";

const PORT = Number(process.env.BT_API_PORT ?? 8787);
const DEFAULT_DATE = process.env.BT_SEED_DATE ?? "2024-07-04";

/**
 * Fixtures are the default so local dev and CI never touch the network.
 * Set `BT_USE_LIVE_MLB=1` to hit the real Stats API instead.
 */
function createMlbClient(): MlbStatsClient {
  if (process.env.BT_USE_LIVE_MLB === "1") {
    console.log("[bt-api] BT_USE_LIVE_MLB=1 — using live statsapi.mlb.com");
    return new HttpMlbStatsClient();
  }
  return new FixtureMlbStatsClient();
}

async function main(): Promise<void> {
  const schedules = new InMemoryScheduleRepository();
  const games = new InMemoryGameRepository();
  const mlb = createMlbClient();
  const ingest = { mlb, schedules, games };

  await ingestScheduleDay(ingest, DEFAULT_DATE);
  console.log(`[bt-api] Seeded fixtures for ${DEFAULT_DATE}`);

  const server = createServer((req, res) => {
    void handleApiRequest(req, res, { ingest }).catch((err: unknown) => {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal" }));
    });
  });

  server.listen(PORT, () => {
    console.log(`[bt-api] Listening on http://localhost:${PORT}`);
    console.log(`[bt-api] GET /api/schedule?date=${DEFAULT_DATE}`);
    console.log(`[bt-api] GET /api/games/744834`);
  });
}

void main();

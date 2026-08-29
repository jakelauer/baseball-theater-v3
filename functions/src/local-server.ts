import { createServer } from "node:http";
import { FixtureMlbStatsClient } from "./adapters/fixtures/mlb.js";
import {
  InMemoryGameRepository,
  InMemoryScheduleRepository,
} from "./adapters/memory/repos.js";
import { handleApiRequest } from "./handlers/api.js";
import { ingestScheduleDay } from "./services/ingest.js";

const PORT = Number(process.env.BT_API_PORT ?? 8787);
const DEFAULT_DATE = process.env.BT_SEED_DATE ?? "2024-07-04";

async function main(): Promise<void> {
  const schedules = new InMemoryScheduleRepository();
  const games = new InMemoryGameRepository();
  const mlb = new FixtureMlbStatsClient();
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

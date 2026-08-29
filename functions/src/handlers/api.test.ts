import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
  InMemoryGameRepository,
  InMemoryScheduleRepository,
} from "../adapters/memory/repos.js";
import { handleApiRequest } from "./api.js";
import { ingestScheduleDay } from "../services/ingest.js";

async function withServer(run: (base: string) => Promise<void>): Promise<void> {
  const schedules = new InMemoryScheduleRepository();
  const games = new InMemoryGameRepository();
  const mlb = new FixtureMlbStatsClient();
  const ingest = { mlb, schedules, games };
  await ingestScheduleDay(ingest, "2024-07-04");

  const server = createServer((req, res) => {
    void handleApiRequest(req, res, { ingest });
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    await run(base);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

describe("handleApiRequest", () => {
  it("serves schedule and game", async () => {
    await withServer(async (base) => {
      const schedule = await fetch(`${base}/api/schedule?date=2024-07-04`);
      expect(schedule.status).toBe(200);
      const day = (await schedule.json()) as { games: unknown[] };
      expect(day.games.length).toBe(2);

      const game = await fetch(`${base}/api/games/744834`);
      expect(game.status).toBe(200);
      const body = (await game.json()) as { gamePk: number };
      expect(body.gamePk).toBe(744834);
    });
  });
});

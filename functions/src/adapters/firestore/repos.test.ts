import { Firestore } from "@google-cloud/firestore";
import type { GameSnapshot, ScheduleDay } from "@bt/domain";
import type { GameRepository, ScheduleRepository } from "@bt/ports";
import { beforeAll, describe, expect, it } from "vitest";
import { FirestoreGameRepository, FirestoreScheduleRepository } from "./repos.js";

const fakeDb = {} as Firestore;

// Compile-checked: the Firestore adapters are drop-in for the port interfaces.
// `tsc --noEmit` (verify-S7 check 1) fails here if a method signature drifts.
const _schedulePort: ScheduleRepository = new FirestoreScheduleRepository(fakeDb);
const _gamePort: GameRepository = new FirestoreGameRepository(fakeDb);
void _schedulePort;
void _gamePort;

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;

function day(date: string): ScheduleDay {
  return { date, games: [], fetchedAt: "2026-09-10T00:00:00.000Z", windowMode: "cache" };
}

function game(gamePk: number, officialDate: string): GameSnapshot {
  return {
    gamePk,
    officialDate,
    status: { abstractGameState: "Final", detailedState: "Final", codedGameState: "F" },
    teams: {
      home: { id: 1, name: "H", abbreviation: "H", runs: 2 },
      away: { id: 2, name: "A", abbreviation: "A", runs: 1 },
    },
    venue: { id: 1, name: "V" },
    linescore: { currentInning: 9, inningState: "Bottom", balls: 0, strikes: 0, outs: 3 },
    plays: [],
    highlights: [],
    fetchedAt: "2026-09-10T00:00:00.000Z",
    windowMode: "cache",
  } as unknown as GameSnapshot;
}

// Round-trip only runs against a live emulator. With FIRESTORE_EMULATOR_HOST
// unset (CI, `pnpm verify`) the whole block is skipped and this file exits 0.
describe.skipIf(!EMULATOR)("Firestore snapshot repositories against the emulator", () => {
  let schedules: FirestoreScheduleRepository;
  let games: FirestoreGameRepository;

  beforeAll(() => {
    const db = new Firestore({ projectId: "bt-emulator-test" });
    schedules = new FirestoreScheduleRepository(db);
    games = new FirestoreGameRepository(db);
  });

  it("upserts and reads back a schedule day", async () => {
    await schedules.upsert(day("2024-07-04"));
    const back = await schedules.getByDate("2024-07-04");
    expect(back?.date).toBe("2024-07-04");
    expect(await schedules.getByDate("1999-01-01")).toBeNull();
  });

  it("upserts a game and lists it by official date", async () => {
    await games.upsert(game(744834, "2024-07-05"));
    expect((await games.getByPk(744834))?.gamePk).toBe(744834);
    const listed = await games.listByDate("2024-07-05");
    expect(listed.map((g) => g.gamePk)).toContain(744834);
  });
});

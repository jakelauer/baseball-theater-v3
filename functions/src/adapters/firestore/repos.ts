/**
 * Firestore implementations of the snapshot repositories (ADR-012 / ADR-013).
 *
 * Thin on purpose: each method is one collection/document call. Freshness
 * metadata, entitlements, crosswalks and the projection/replay stores are not
 * here — S7 covers only `ScheduleRepository` / `GameRepository`.
 *
 * The `Firestore` client honours `FIRESTORE_EMULATOR_HOST`, so the emulator and
 * prod paths are the same code. `local-server.ts` still defaults to the
 * in-memory adapters; these are opt-in via `BT_USE_FIRESTORE=1`.
 */
import { Firestore } from "@google-cloud/firestore";
import type { GameSnapshot, ScheduleDay } from "@bt/domain";
import type { GameRepository, ScheduleRepository } from "@bt/ports";

const SCHEDULES = "schedules";
const GAMES = "games";

/** Firestore rejects `undefined`; the snapshots are plain JSON, so round-trip. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class FirestoreScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: Firestore = new Firestore()) {}

  async getByDate(date: string): Promise<ScheduleDay | null> {
    const snap = await this.db.collection(SCHEDULES).doc(date).get();
    return snap.exists ? (snap.data() as ScheduleDay) : null;
  }

  async upsert(day: ScheduleDay): Promise<void> {
    await this.db.collection(SCHEDULES).doc(day.date).set(plain(day));
  }
}

export class FirestoreGameRepository implements GameRepository {
  constructor(private readonly db: Firestore = new Firestore()) {}

  async getByPk(gamePk: number): Promise<GameSnapshot | null> {
    const snap = await this.db.collection(GAMES).doc(String(gamePk)).get();
    return snap.exists ? (snap.data() as GameSnapshot) : null;
  }

  async upsert(game: GameSnapshot): Promise<void> {
    await this.db.collection(GAMES).doc(String(game.gamePk)).set(plain(game));
  }

  async listByDate(date: string): Promise<GameSnapshot[]> {
    const result = await this.db
      .collection(GAMES)
      .where("officialDate", "==", date)
      .get();
    return result.docs.map((doc) => doc.data() as GameSnapshot);
  }
}

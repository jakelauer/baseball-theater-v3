/**
 * Where projected BT store documents are written.
 *
 * This lives beside the ingest service rather than in `@bt/ports` because the
 * five documents are still settling; promote it to a port when the Firestore
 * adapter lands (S7) and a second implementation exists to justify the seam.
 */
import type { GameProjection } from "@bt/domain";

export interface GameProjectionRepository {
  upsert(projection: GameProjection): Promise<void>;
  getByPk(gamePk: number): Promise<GameProjection | null>;
}

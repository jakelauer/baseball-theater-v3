/**
 * Where projected BT store documents are written.
 *
 * This lives beside the ingest service rather than in `@bt/ports` because the
 * five documents are still settling; it becomes a port when the Postgres
 * adapter gives it a second implementation (S46, S50; ADR-018).
 */
import type { GameProjection } from "@bt/domain";

export interface GameProjectionRepository {
	upsert(projection: GameProjection): Promise<void>;
	getByPk(gamePk: number): Promise<GameProjection | null>;
}

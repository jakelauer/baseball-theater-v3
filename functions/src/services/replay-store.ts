/**
 * Where a captured post-game replay is persisted.
 *
 * Like `projection-store.ts`, this sits beside the ingest services rather than
 * in `@bt/ports`: the artifact shape is still settling and there is only one
 * implementation (memory). It becomes a port when the Postgres adapter gives
 * it a second implementation (S46, S50; ADR-018).
 */
import type { ReplayPatchEntry } from "@bt/mlb-api";

/**
 * One game's replay: a pointer to the base feed timecode plus the ordered,
 * idle-collapsed patch sequence that walks it to the final state. The base feed
 * bytes are not stored here — the reconstructor is handed them separately.
 */
export interface ReplayArtifact {
	gamePk: number;
	/** The timecode the patch chain roots at (`timestamps[0]`). */
	baseTimecode: string;
	/** End timecode of each retained patch, in order. */
	timecodes: string[];
	/** Retained (non-empty-diff) patches, oldest first. */
	patches: ReplayPatchEntry[];
}

export interface ReplayArtifactRepository {
	upsert(artifact: ReplayArtifact): Promise<void>;
	getByPk(gamePk: number): Promise<ReplayArtifact | null>;
}

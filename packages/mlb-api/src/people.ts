/**
 * `GET /api/v1/people` payload shape.
 *
 * The person body is the same `Person` the schedule and live feeds hydrate —
 * this endpoint simply hydrates it deeper and can attach season stat splits.
 * Those splits live in `stats.ts` with the rest of the stat vocabulary, so
 * this module stays the thin envelope it actually is upstream.
 */
import type { Person } from "./common.js";

export interface PeopleResponse {
  copyright?: string;
  people?: Person[];
}

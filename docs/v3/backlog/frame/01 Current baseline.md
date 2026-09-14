## Current baseline

**As of:** 2026-09-13 at HEAD `40b6547` (last story landed: **S26**). Kept current by rule 17 — every change set that flips a story to `done` or adds/removes/re-scopes a story updates this table and the **As of** line. The original snapshot was taken at tag `loop-baseline` (`69e9fc5`); `git show <sha>:docs/v3/BACKLOG.md` recovers any earlier state.

| Area | State |
|------|-------|
| Scoreboard (fixture date) | Working — hand-rolled `fetch` (see client data layer) |
| Game → Videos (impact heuristic sort) | Working |
| Game → Plays (strike zone + trajectory) | Working (fixture plays for 744834) |
| Game → Live / Box / Recap | Stubs — Live shows inning/state/outs only; no balls/strikes; Box/Recap empty; no tests (see **S3** / **S2** / **S10**) |
| Standings / Search / Settings | Stubs — placeholder text only (see **S4** / **S5** / **S6**) |
| Brand theme (VISUAL-DESIGN tokens + `auto` color scheme) | **Done** (**S24**) |
| MLB Stats API live client | **Done** — `functions/src/adapters/http/mlb.ts` behind `MlbStatsClient`, opt-in via `BT_USE_LIVE_MLB=1` (**S12**); content / standings / players mappers (**S13**) |
| Upstream MLB TypeScript contracts | **Done** — `packages/mlb-api` zod parsers + leaf-path coverage gate over `fixtures/raw/` (**S11** / **S23**) |
| Fixture recording | **Done** — `functions/src/scripts/record-fixtures.ts` (**S14**) |
| MLB API drift / new-field discovery | **Done** — `pnpm mlb:scan-drift` (**S15**) |
| ADR-002 ingest cadence worker | **Done** — `services/ingest.ts` `tickIngest`; local server ticks with `BT_INGEST_TICK=1` (**S16**). Not yet a deployed scheduled function |
| Out-of-window refresh-on-read / single-flight | **Done** — `services/refresh.ts` (**S17**) |
| Ingest → derived BT store projections | **Done** — `services/projection-store.ts` (**S21**) |
| Post-game diffPatch capture + replay | **Done** — `services/capture-replay.ts` / `replay-store.ts` (**S22**) |
| BT API type contract | **Done** — `ApiRoutes` in `packages/domain/src/api-routes.ts` binds `sendJson<R>` / `getJson<R>` to `*Response` aliases (**S26**, [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) alias seam) |
| API versioning | **Partial** — routes are `/api/v1/*` (**S26**); no OpenAPI spec or breaking-change gate (**S27**), no generated client (**S29**), no deprecation/sunset path (**S28**) ([ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted)) |
| Client data/state layer | **Missing** — `GamePage` / `ScoreboardPage` hand-roll `useState` + `useEffect` + `fetch`; no cache, no dedup, no in-place patch (see **S25** / [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted)) |
| Client live delivery (BT SSE/WS/poll) | **Missing** — HTTP GET only; no watched-game push (see **S18** / **S19** / **S20**) |
| Auth (magic link + passkeys) | Not started — `LocalAuthVerifier` (`functions/src/adapters/fixtures/auth.ts`, `local:` token prefix) exists but is unwired (see **S8**) |
| Firestore | **Partial** — adapter behind ports (`functions/src/adapters/firestore/repos.ts`, opt-in via `BT_USE_FIRESTORE=1` + emulator) (**S7**); not the default |
| Firebase Functions deploy | Not started (local Node API only) |
| Emulator-based `pnpm dev` | Partial — local API + Vite; Firestore emulator configured in `firebase.json` but not part of `pnpm dev` (see **S9**) |
| Multi-source deep links / AI / push | Not started |

---

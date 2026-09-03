# Baseball Theater v3 — Checkable backlog

**Purpose:** Turn [FEATURES](./FEATURES.md) + [ARCHITECTURE](./ARCHITECTURE.md) into increments a loop can finish without a human “looks good” step.

**Rules for every story**

1. Acceptance criteria map to **commands, tests, or file invariants** (exit codes / assertions).
2. Vague phrases (“works correctly”, “handles errors gracefully”) are **forbidden** until rewritten.
3. Done means **`pnpm verify` exits 0** *and* every story-specific check passes.
4. Prefer the smallest story that moves the carried product loop forward.
5. When starting a story, set its **Status** to `doing`. When all acceptance criteria pass, set it to `done` in this file in the same change set as the implementation (do not leave status stale).

**Status legend:** `todo` · `doing` · `done` · `blocked`

**Pilot:** Story **S1** — run first under `/goal` while watching.

---

## Current baseline (as of `loop-baseline`)

| Area | State |
|------|-------|
| Scoreboard (fixture date) | Working |
| Game → Videos (impact heuristic sort) | Working |
| Game → Plays (strike zone + trajectory) | Working (fixture plays for 744834) |
| Game → Live / Box / Recap | Stubs |
| Standings / Search / Settings | Stubs |
| Auth (magic link + passkeys) | Not started |
| Firestore / Firebase Functions deploy | Not started (local Node API only) |
| Emulator-based `pnpm dev` | Partial (local API + Vite; not full Emulator Suite) |
| Multi-source deep links / AI / push | Not started |

---

## Stories

### S1 — Domain window helpers fully tested *(pilot)*

**Why first:** Tiny, no UI flake, teaches the verify loop.

**Scope files:** `packages/domain/src/window.ts`, `packages/domain/src/window.test.ts`, plus `docs/v3/BACKLOG.md` Status flip.

**Acceptance criteria**

1. `packages/domain/src/window.test.ts` exists and covers at least:
   - live status → active window `true`
   - final status inside trail → `true`
   - final status outside trail → `false`
   - scheduled game inside lead window → `true`
   - scheduled game far outside window → `false`
   - `normalizeStatusCode` unknown → `"U"`
2. `pnpm --filter @bt/domain exec vitest run src/window.test.ts` exits 0
3. `pnpm verify` exits 0
4. `git diff --name-only` (vs story start) only touches paths under `packages/domain/`

**Status:** `done`

**Pilot `/goal` prompt**

```text
/goal S1 acceptance criteria are met from docs/v3/BACKLOG.md:
- packages/domain/src/window.test.ts covers live/final/lead/outside/normalize cases listed in S1
- pnpm --filter @bt/domain exec vitest run src/window.test.ts exits 0
- pnpm verify exits 0
- no files outside packages/domain/ are modified (except docs/v3/BACKLOG.md Status → done)
- docs/v3/BACKLOG.md S1 Status is set to done
or stop after 8 turns
```

---

### S2 — Box score tab renders fixture innings

**Gap:** Game → Box is a stub; FEATURES carries box score.

**Acceptance criteria**

1. Fixture or game payload includes a `boxscore` (or equivalent domain type) for `744834` with ≥1 batting entry per team
2. `GET /api/games/744834` JSON includes that boxscore
3. RTL (or Vitest) test: rendering Game box tab shows away and home team abbreviations from the fixture
4. `pnpm verify` exits 0

**Status:** `todo`

---

### S3 — Live tab shows linescore + current count from snapshot

**Gap:** Live tab is placeholder text.

**Acceptance criteria**

1. Live tab displays inning, inning state, outs, balls, strikes from `game.linescore` for fixture `744834`
2. Component test asserts those values appear for the fixture payload
3. `pnpm verify` exits 0

**Status:** `todo`

---

### S4 — Standings fixture API + page

**Gap:** Standings stub; FEATURES carries standings.

**Acceptance criteria**

1. `fixtures/standings-2024-07-04.json` (or season snapshot) committed
2. `GET /api/standings?date=2024-07-04` returns 200 with ≥2 divisions and team records
3. `StandingsPage` renders at least one team name from the fixture (RTL test)
4. `pnpm verify` exits 0

**Status:** `todo`

---

### S5 — Search page queries highlights fixture

**Gap:** Search stub; FEATURES carries highlight search.

**Acceptance criteria**

1. `GET /api/search/highlights?q=walk-off` returns ≥1 highlight from fixtures (case-insensitive title/blurb match)
2. Search page shows results for that query (RTL or API test + page test)
3. Empty query returns 400 with stable error code `query_required`
4. `pnpm verify` exits 0

**Status:** `todo`

---

### S6 — Settings page persists favorites in localStorage (free tier)

**Gap:** Settings stub; cloud sync is patron-gated later.

**Acceptance criteria**

1. User can toggle at least one favorite team id; reload keeps it (jsdom localStorage test)
2. No network calls required
3. `pnpm verify` exits 0

**Status:** `todo`

---

### S7 — Firestore adapter behind ports (emulator-ready)

**Gap:** ADR-012 / ADR-013 — memory repos only.

**Acceptance criteria**

1. `FirestoreScheduleRepository` + `FirestoreGameRepository` implement ports
2. Integration test runs against Firestore emulator **or** skips cleanly when emulator env unset; when `FIRESTORE_EMULATOR_HOST` set, round-trip upsert/get passes
3. Local default remains memory/fixtures (no behavior regression): existing API tests still pass
4. `pnpm verify` exits 0

**Status:** `todo`

---

### S8 — Auth ports: magic-link + passkey verifier stubs for local

**Gap:** ADR-004 not implemented.

**Acceptance criteria**

1. Port methods exist for verify session / create magic-link request / passkey ceremony stubs
2. Local verifier accepts a documented test token (`Authorization: Bearer dev:<uid>`) and rejects missing auth with 401 on a protected route (e.g. `GET /api/me`)
3. Tests cover 200 + 401 cases without real Firebase
4. `pnpm verify` exits 0

**Status:** `todo`

---

### S9 — Align `pnpm dev` with emulator story (document + smoke)

**Gap:** ADR-013 targets Emulator Suite; today is local Node API + Vite.

**Acceptance criteria**

1. README documents exact current `pnpm dev` ports and what is/isn’t emulated
2. Optional `pnpm verify:smoke` script hits `/health` and `/api/schedule?date=2024-07-04` against a short-lived local server and exits 0
3. `pnpm verify` exits 0 (may include smoke if added to the gate)

**Status:** `todo`

---

### S10 — Recap tab shows editorial blurb from fixture

**Gap:** Recap stub; FEATURES carries editorial recap.

**Acceptance criteria**

1. Game fixture includes `recap` text/html or structured content for at least one game
2. Recap tab renders that content; test asserts a unique substring
3. `pnpm verify` exits 0

**Status:** `todo`

---

### Later themes (not yet story-sliced)

Break into checkable stories only when starting them:

- Patreon OAuth link + entitlement refresh (ADR-004)
- Multi-source deep links Phase 1 (ADR-009)
- Impact Phase B / day digest (ADR-010)
- Inning insight feed + game package (ADR-011)
- Push notifications (Later)
- Firebase Hosting/Functions deploy workflow

---

## Gap map (doc → story)

| Doc item | Stories |
|----------|---------|
| Scoreboard → game loop | Partially done; S2–S3, S10 |
| Standings | S4 |
| Search | S5 |
| Settings | S6 |
| BT-backed data / ports | S7, S9 |
| Auth G3 | S8 (+ later Patreon) |
| Plays / pitch viz | Done at baseline |
| AI / multi-source / push | Later themes |

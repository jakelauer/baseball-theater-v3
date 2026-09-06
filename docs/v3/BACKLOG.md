# Baseball Theater v3 — Checkable backlog

**Purpose:** Turn [FEATURES](./FEATURES.md) + [ARCHITECTURE](./ARCHITECTURE.md) into increments a loop can finish without a human “looks good” step.

**Rules for every story**

1. Acceptance criteria map to **commands, tests, or file invariants** (exit codes / assertions).
2. Vague phrases (“works correctly”, “handles errors gracefully”) are **forbidden** until rewritten.
3. Done means **`scripts/verify-<ID>.sh` exits 0** *and* **`pnpm verify` exits 0** *and* Status is `done` in this file (top table included).
4. Prefer the smallest story that moves the carried product loop forward. When UI and data-model work compete, **prefer MLB API + ingest/projection stories** — UI should follow how BT stores and organizes data.
5. When starting a story, set its **Status** to `doing`. When all acceptance criteria pass, set it to `done` in this file in the same change set as the implementation (do not leave status stale). Keep the **Story status** table in sync (Status **and** sort by **Priority**).
6. **Do not start the next story/goal** until the finished story is **committed** (clean `git status` for that work, or an explicit commit SHA on the branch). Uncommitted “done” work blocks the next goal — reject moving on and commit (or ask the user to) first.
7. **First work item is always the grader.** Sub-item 0 writes `scripts/verify-<ID>.sh`. After that file exists, the rest of the story must not modify `scripts/` or `test/` (see Goal condition). Colocated `*.test.ts(x)` next to source are allowed when their directory is in `<paths>`.
8. Each story has a copy-paste **`/goal` command**. It points at `scripts/verify-<ID>.sh` instead of restating checks. Creating that one file (Work item 0) is the only allowed `scripts/` change; after it exists, do not edit `scripts/` or `test/`.
9. **Prove the grader red before green.** A run must execute the new `scripts/verify-<ID>.sh` against current HEAD and surface the nonzero exit *before* any product code is written. A grader first seen passing proves nothing: a weak script plus a weak implementation goes green and you learn nothing. (Only **S1** is exempt — it is already implemented, so its script must pass on HEAD.)
10. **The scope fence is hard.** If an acceptance criterion cannot be met inside a story’s **Scope files**, the run **stops and reports** the criterion and the path it needs. Widening the fence mid-run is never the agent’s call — the story was mis-scoped, so fix the story.
11. **Every story ships a numeric turn cap.** `N` is not a cap. If a defensible number can’t be named, the story isn't bounded yet — fix the ambiguity (pick the tree, fix the document set, cut the scope) until it can be. Record the assumption the cap rests on next to it.

**Status legend:** `todo` · `doing` · `done` · `blocked`

### Verify-script contract

Every `scripts/verify-<ID>.sh` must:

- Exit **0** only when **every** acceptance-criterion check for that story holds; exit **nonzero** otherwise.
- Print each failed check on its own line (the check number and a short reason).
- **Fail against current HEAD** when the story’s product work does not exist yet (all `todo` stories today). Exception: **S1** is already implemented — its script must **pass** on current HEAD.
- Be deterministic and read-only toward the world: **no network**, **no writes outside the repo**, **no production** Firebase/MLB/Patreon. It must not write to the working tree (temp dirs under `/tmp` are fine). Localhost to an ephemeral server **started by a story-scoped Vitest file** is allowed; MLB, Firebase prod, and the public internet are not.
- Do its **own** checking. It must **not** invoke `pnpm verify`, repo-wide `pnpm test`, or `pnpm test:coverage`. It may run **named, story-scoped** Vitest files listed in that story’s checks.
- Finish in **under 60 seconds**.
- Be **demonstrated failing on HEAD first** (rule 9). This is a property of the run, not the file: write the script, run it, show the nonzero exit, then implement.

### Story status

Ordered by **Priority** (execution order). Story IDs (`S1`…`S21`) are stable labels, not rank.

| Priority | ID | Story | Status |
|----------|----|-------|--------|
| 1 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers fully tested *(pilot)* | `done` |
| 2 | [S11](#s11--mlb-upstream-payload-types-for-carried-loop) | MLB upstream payload types (carried loop) | `done` |
| 3 | [S12](#s12--live-http-mlbstatsclient--domain-mappers) | Live HTTP `MlbStatsClient` + domain mappers | `done` |
| 4 | [S21](#s21--project-ingested-mlb-into-durable-bt-store-shapes) | Project ingested MLB into durable BT store shapes | `todo` |
| 5 | [S13](#s13--expand-mlb-client-content-standings-players) | Expand MLB client: content, standings, players | `todo` |
| 6 | [S14](#s14--fixture-recorder-from-live-client) | Fixture recorder from live client | `todo` |
| 7 | [S15](#s15--mlb-api-capability-drift-scanner) | MLB API capability drift scanner | `todo` |
| 8 | [S16](#s16--adr-002-active-window-ingest-cadence-loop) | ADR-002 active-window ingest cadence loop | `todo` |
| 9 | [S17](#s17--out-of-window-refresh-on-read--single-flight) | Out-of-window refresh-on-read + single-flight | `todo` |
| 10 | [S7](#s7--firestore-adapter-behind-ports-emulator-ready) | Firestore adapter behind ports | `todo` |
| 11 | [S2](#s2--box-score-tab-renders-fixture-innings) | Box score tab renders fixture innings | `todo` |
| 12 | [S3](#s3--live-tab-shows-linescore--current-count-from-snapshot) | Live tab shows linescore + current count | `todo` |
| 13 | [S10](#s10--recap-tab-shows-editorial-blurb-from-fixture) | Recap tab shows editorial blurb | `todo` |
| 14 | [S4](#s4--standings-fixture-api--page) | Standings fixture API + page | `todo` |
| 15 | [S5](#s5--search-page-queries-highlights-fixture) | Search page queries highlights fixture | `todo` |
| 16 | [S18](#s18--bt-mediated-live-delivery-ssewebsocket-port) | BT-mediated live delivery (SSE/WebSocket port) | `todo` |
| 17 | [S19](#s19--web-client-auto-updates-watched-game) | Web client auto-updates watched game | `todo` |
| 18 | [S20](#s20--scoreboard-live-refresh-for-in-window-games) | Scoreboard live refresh for in-window games | `todo` |
| 19 | [S6](#s6--settings-page-persists-favorites-in-localstorage-free-tier) | Settings favorites in localStorage | `todo` |
| 20 | [S8](#s8--auth-ports-magic-link--passkey-verifier-stubs-for-local) | Auth ports: magic-link + passkey stubs | `todo` |
| 21 | [S9](#s9--align-pnpm-dev-with-emulator-story-document--smoke) | Align `pnpm dev` + smoke | `todo` |

**Next:** lowest **Priority** with Status `todo` (currently **4 / S21**).

When flipping Status, keep this table sorted by Priority. Do **not** have clients hit MLB or open unbounded Firestore listeners on hot game docs (ADR-002 cost path).

### Goal command for multiple stories

```/goal docs/v3/BACKLOG.md SX then SY. Follow the Rules for every story, plus each story's Goal condition and Turn cap as written — in particular rule 9 (show me each grader failing on HEAD before product code), rule 10 (stop and report rather than widening a fence), and rule 6 (do not start a story until the work for the prior story is committed). Stop after <SX cap + SY cap> turns total.```

---

## Current baseline (as of `loop-baseline`)

| Area | State |
|------|-------|
| Scoreboard (fixture date) | Working |
| Game → Videos (impact heuristic sort) | Working |
| Game → Plays (strike zone + trajectory) | Working (fixture plays for 744834) |
| Game → Live / Box / Recap | Stubs (Live shows inning/state/outs only; no balls/strikes; no tests) |
| Standings / Search / Settings | Stubs |
| MLB Stats API live client | **Missing** — fixtures only; `MlbStatsClient` is schedule+game |
| Upstream MLB TypeScript contracts | **Missing** — thin BT domain types only; no live-feed/content/standings payload types (raw payloads now committed under `fixtures/raw/`) |
| MLB API drift / new-field discovery | **Missing** — no scanner for unused paths in recent game payloads |
| ADR-002 ingest cadence worker | **Missing** — no scheduled in-window MLB→BT upsert loop |
| Out-of-window refresh-on-read / single-flight | **Missing** |
| Client live delivery (BT SSE/WS/poll) | **Missing** — HTTP GET only; no watched-game push |
| Ingest → derived BT store projections | **Missing** — mostly pass-through snapshots; no first-class projection pipeline |
| Auth (magic link + passkeys) | Not started (`LocalAuthVerifier` exists, unwired; token prefix `local:` not `dev:`) |
| Firestore / Firebase Functions deploy | Not started (local Node API only) |
| Emulator-based `pnpm dev` | Partial (local API + Vite; not full Emulator Suite) |
| Multi-source deep links / AI / push | Not started |

---

## Stories

### S1 — Domain window helpers fully tested *(pilot)*

**Why first:** Tiny, no UI flake, teaches the verify loop.

**Scope files:** `packages/domain/src/window.ts`, `packages/domain/src/window.test.ts`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S1.sh` meeting the [Verify-script contract](#verify-script-contract). **S1 exception (rule 9):** product work already landed — run it against current HEAD and show it **pass**.

**Acceptance criteria** (checks `scripts/verify-S1.sh` performs)

1. `packages/domain/src/window.test.ts` exists.
2. That file contains tests that assert all of:
   - live status → `isGameInActiveWindow` is `true`
   - final status inside trail → `true`
   - final status outside trail → `false`
   - scheduled game inside lead window → `true`
   - scheduled game far outside the window → `false`
   - `normalizeStatusCode` on an unknown code → `"U"`
3. `pnpm --filter @bt/domain exec vitest run src/window.test.ts` exits 0.
4. This file’s S1 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S1.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S1. Work item 0 first: if scripts/verify-S1.sh is missing, write it per the Verify-script contract and run it against current HEAD, showing it exit 0 (S1 is already implemented — the contract’s one exception to red-first). Then: scripts/verify-S1.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S1.sh, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S2 — Box score tab renders fixture innings

**Gap:** Game → Box is a stub; FEATURES carries box score.

**Prefer after:** **S21** (and S11 types) so the box tab binds to stored BT boxscore projection, not a one-off fixture shape.

**Scope files:** `fixtures/`, `packages/domain/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S2.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S2.sh` performs)

1. The committed game payload for `744834` (`fixtures/game-744834.json` or a file the API merges into that game) includes a `boxscore` object.
2. `boxscore.teams.away.batting` and `boxscore.teams.home.batting` are arrays with length ≥ 1 each. Each entry has a player identifier (`id` number or `name`/`fullName` string).
3. An in-process `GET /api/games/744834` (story-scoped functions test, same pattern as `functions/src/handlers/api.test.ts`) returns 200 and the JSON includes that `boxscore` with the same batting-length invariant.
4. A web RTL/Vitest file exists that renders the Game **box** tab for fixture `744834` and asserts the away abbreviation `NYM` and home abbreviation `WSH` appear **inside the box tab panel** (not only the page header that already shows `NYM @ WSH`).
5. That web test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
6. This file’s S2 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether the box table is visually readable (column layout, wrapping). The script only checks data presence and abbreviations in the box panel.

**Tightened (flagged)**

- Replaced “boxscore (or equivalent domain type)” with a required JSON field `boxscore` and path `boxscore.teams.{away,home}.batting[]`.
- Required batting entries to carry `id` or `name`/`fullName`.
- Required abbreviations to be asserted in the **box panel**, because the header already renders them today (a header-only test would pass on HEAD).

**Goal condition:** scripts/verify-S2.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S2. Work item 0 first: if scripts/verify-S2.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S2.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S2.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S3 — Live tab shows linescore + current count from snapshot

**Gap:** Live tab is incomplete: inning / inning state / outs render; balls and strikes do not; no component test.

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S3.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S3.sh` performs)

1. A web RTL/Vitest file exists that renders the Game **live** tab with the fixture `744834` payload and asserts all five `game.linescore` fields appear **inside the live tab panel**:
   - `currentInning` → `9`
   - `inningState` → `End`
   - `outs` → `3`
   - `balls` → `0`
   - `strikes` → `0`
2. Balls and strikes are shown as a **labeled count** in that panel (the test asserts a label such as `Balls`/`Strikes` or a count token that includes both values). A bare `0` matching the header away-runs is not enough.
3. That test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
4. `web/src/pages/GamePage.tsx` (or a Live child it renders) references `linescore.balls` and `linescore.strikes`.
5. This file’s S3 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Visual placement of the count vs the rest of the live panel.

**Tightened (flagged)**

- Bound the five fields to fixture `744834`’s actual values (`9`, `End`, `3`, `0`, `0`).
- Required a labeled balls/strikes count so the existing header `0 – 1` cannot satisfy the check.
- Required the assertions to target the **live panel** (inning/state/outs already render there; balls/strikes do not).

**Goal condition:** scripts/verify-S3.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S3. Work item 0 first: if scripts/verify-S3.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S3.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S3.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S4 — Standings fixture API + page

**Gap:** Standings stub; FEATURES carries standings.

**Prefer after:** S13 + **S21** (typed fetch and standings stored as BT projection).

**Scope files:** `fixtures/`, `packages/domain/`, `packages/ports/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S4.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S4.sh` performs)

1. `fixtures/standings-2024-07-04.json` exists and is valid JSON.
2. That fixture contains ≥2 divisions. Each division has a name/id and a teams list. Each listed team has a name string (`name` or `teamName`) and numeric `wins` and `losses`.
3. An in-process `GET /api/standings?date=2024-07-04` (story-scoped functions test) returns 200. The JSON has ≥2 divisions and team records matching check 2.
4. A web RTL/Vitest file exists that renders `StandingsPage` and asserts at least one team **name** from that fixture appears on the page.
5. That web test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
6. This file’s S4 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Dropped the “or season snapshot” filename waffle; the committed file must be `fixtures/standings-2024-07-04.json`.
- Required `wins` and `losses` on each team record (original said “team records” without fields).

**Goal condition:** scripts/verify-S4.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, packages/ports/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S4. Work item 0 first: if scripts/verify-S4.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S4.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, packages/ports/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S4.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S5 — Search page queries highlights fixture

**Gap:** Search stub; FEATURES carries highlight search.

**Scope files:** `fixtures/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S5.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S5.sh` performs)

1. An in-process `GET /api/search/highlights?q=walk-off` returns 200 and a JSON array (or `{ highlights: [...] }`) with length ≥ 1.
2. At least one returned highlight has `title` or `blurb` matching `/walk-off/i` (fixture `744834` title is `Lane Thomas hits a walk-off home run`).
3. `GET /api/search/highlights` with empty or missing `q` returns **400** and a JSON error code exactly `query_required`.
4. A web RTL/Vitest file exists that drives the Search page with query `walk-off` and asserts a result title/blurb from check 2 is visible.
5. That web test file and the functions test covering checks 1–3 exit 0 when run as named story-scoped Vitest files.
6. This file’s S5 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S5.sh exits 0, pnpm verify exits 0, no files outside fixtures/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S5. Work item 0 first: if scripts/verify-S5.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S5.sh exits 0, pnpm verify exits 0, no files outside fixtures/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S5.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S6 — Settings page persists favorites in localStorage (free tier)

**Gap:** Settings stub; cloud sync is patron-gated later.

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S6.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S6.sh` performs)

1. A web RTL/jsdom test exists that: renders `SettingsPage`; toggles a favorite for a numeric team id; remounts the page (or simulates reload); and asserts that team id is still selected/persisted via `localStorage`.
2. That test does not call `fetch` or `XMLHttpRequest` (no network). The script greps the Settings page module and its test for `fetch(` / `XMLHttpRequest` and fails if either is used to persist favorites.
3. That test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
4. This file’s S6 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Required remount/reload via `localStorage` (original said “reload keeps it”).
- Made “no network calls required” a grep + test invariant, not a comment.

**Goal condition:** scripts/verify-S6.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S6. Work item 0 first: if scripts/verify-S6.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S6.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S6.sh, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S7 — Firestore adapter behind ports (emulator-ready)

**Gap:** ADR-012 / ADR-013 — memory repos only.

**Scope files:** `functions/src/`, `packages/ports/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S7.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S7.sh` performs)

1. `FirestoreScheduleRepository` and `FirestoreGameRepository` exist under `functions/src/adapters/` and are TypeScript-assignable to `ScheduleRepository` and `GameRepository` (a story-scoped type-level or compile-checked test proves this).
2. A functions integration test file exists that:
   - **skips** (Vitest `skip` / `skipIf`) the emulator round-trip when `FIRESTORE_EMULATOR_HOST` is unset, and that file still exits 0 in that case;
   - contains an upsert-then-get round-trip assertion that runs when `FIRESTORE_EMULATOR_HOST` is set.
3. `functions/src/local-server.ts` still constructs `InMemoryScheduleRepository` / `InMemoryGameRepository` (or equivalent memory adapters) as the default — not Firestore — unless an explicit documented env flag is set.
4. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (existing API tests still pass offline).
5. This file’s S7 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- When `FIRESTORE_EMULATOR_HOST` is set, the round-trip actually passing against a running emulator. The script must not start the emulator, must not require it, and must not claim that path passed. It only checks that the skip/run split exists and the skip path exits 0.

**Goal condition:** scripts/verify-S7.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/ports/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — bounded by the ACs: two adapters, one skip-guarded integration test, memory stays default. Security rules and emulator startup/config are **out of scope** here (later story); if you find yourself writing rules, stop.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S7. Work item 0 first: if scripts/verify-S7.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S7.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/ports/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S7.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S8 — Auth ports: magic-link + passkey verifier stubs for local

**Gap:** ADR-004 not implemented.

**Scope files:** `packages/ports/`, `functions/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S8.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S8.sh` performs)

1. `packages/ports/src/auth.ts` (or a sibling port in `packages/ports/src/`) exports:
   - a session verifier (`verifyBearerToken` or `verifySession`);
   - `createMagicLinkRequest` (or equivalently named create-magic-link method);
   - passkey ceremony stubs (begin/complete registration and authentication, or one documented stub API covering the ceremony).
2. An in-process `GET /api/me` **without** `Authorization` returns **401**.
3. `GET /api/me` with `Authorization: Bearer dev:<uid>` (use a documented test uid such as `dev:test-user`) returns **200** and a body that includes that uid. The accepted prefix is **`dev:`** as specified here — not `local:`.
4. A functions test file covers the 200 and 401 cases and does not import `firebase-admin` / Firebase Auth SDK.
5. That test file exits 0 when run as a named story-scoped Vitest file.
6. This file’s S8 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Named the port methods the script greps for (magic-link + passkey ceremony). Original said “exist” without identifiers.
- Kept `Bearer dev:<uid>` (current unwired stub uses `local:` — the story must implement `dev:`, not the other way around).

**Goal condition:** scripts/verify-S8.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S8. Work item 0 first: if scripts/verify-S8.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S8.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S8.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S9 — Align `pnpm dev` with emulator story (document + smoke)

**Gap:** ADR-013 targets Emulator Suite; today is local Node API + Vite.

**Scope files:** `README.md`, `package.json`, `functions/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S9.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S9.sh` performs)

1. `README.md` contains the current `pnpm dev` ports: **8787** (API) and **5173** (web).
2. `README.md` states whether Firebase Emulator Suite is started by `pnpm dev` (today it is not). The script greps for `8787`, `5173`, and `emulator` (case-insensitive) in `README.md`.
3. Root `package.json` has a `verify:smoke` script.
4. Running `pnpm verify:smoke` starts a short-lived local server, `GET`s `/health` and `/api/schedule?date=2024-07-04`, and exits 0. The smoke entrypoint must live under `functions/` (or another path in Scope files) — **not** under `scripts/` — so the Goal condition can freeze `scripts/`.
5. This file’s S9 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether the README’s emulator explanation is complete enough for a new contributor (the script only checks the required tokens).

**Tightened (flagged)**

- Required the README to mention `emulator` explicitly, not only ports.
- Required `verify:smoke` to live outside `scripts/` so it does not collide with the grader freeze.
- Original allowed smoke to be optional (“Optional `pnpm verify:smoke`”); this story’s checks require the script to exist. That is a **tightening**, not a drop: the optional wording was the gap this story exists to close.

**Goal condition:** scripts/verify-S9.sh exits 0, pnpm verify exits 0, no files outside README.md, package.json, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S9. Work item 0 first: if scripts/verify-S9.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S9.sh exits 0, pnpm verify exits 0, no files outside README.md, package.json, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S9.sh, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S10 — Recap tab shows editorial blurb from fixture

**Gap:** Recap stub; FEATURES carries editorial recap.

**Scope files:** `fixtures/`, `packages/domain/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S10.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S10.sh` performs)

1. At least one committed game fixture (`fixtures/game-*.json`) includes a `recap` object with `text`, `html`, or `blurb` whose string length is ≥ 20.
2. `GET /api/games/<that gamePk>` JSON includes the same `recap` field (in-process functions test).
3. A web RTL/Vitest file renders the Game **recap** tab for that game and asserts a unique substring (≥ 12 characters, taken from the fixture `recap`) appears **inside the recap panel**.
4. That web test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
5. This file’s S10 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Required `recap.text` | `recap.html` | `recap.blurb` with minimum lengths so “includes recap” is not an empty string.
- Required the substring assertion to target the recap panel (not the videos list).

**Goal condition:** scripts/verify-S10.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S10. Work item 0 first: if scripts/verify-S10.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S10.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S10.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

## Data platform — MLB access & types

v2’s `baseball-theater-engine` (contracts + `MlbDataServer`) is **not** copied as a package — **do not reuse v2 source types**. Rebuild the *capability* behind ports: typed upstream payloads → mappers → BT domain → fixture + live adapters (ADR-001 / ADR-012). Do **not** reintroduce browser→proxy→MLB.

**Type design (required for S11+):**

- Prefer **named interfaces/types that reference each other** (v2-style composition), not gigantic inline nested object literals.
- Names must reflect **purpose** (`PitchCoordinates`, `LiveGamePlayEvent`, `ScheduleGameTeam`, …) and be **intelligently separable** into modules by concern (live feed, schedule, content, standings, players).
- Upstream MLB types stay separate from BT product domain (`GameSnapshot`, etc.).
- Unknown / newly seen fields must be discoverable (see **S15**), not silently dropped without a report.

### S11 — MLB upstream payload types for carried loop

**Gap:** Domain has product snapshots (`GameSnapshot`, `AtBat`) but no typed Stats API live-feed / schedule / content shapes to parse against. Hand-authored fixtures skip that layer.

**Scope files:** `packages/mlb-api/`, `fixtures/raw/`, `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`

**Prerequisite (satisfied 2026-09-06):** `fixtures/raw/` holds real `statsapi.mlb.com` payloads for **CHC @ MIA, gamePk 823823, 2026-09-05** — recorded out-of-band through the `baseball.theater/api/proxy/` passthrough, because the Verify-script contract forbids network and the recorder is S14 (Priority 6). They are committed **byte-exact** (`fixtures/raw` is in `.prettierignore`). Do not hand-author or reformat these; re-record with the same upstream URLs if they go stale:

| File | Upstream |
|------|----------|
| `fixtures/raw/schedule-2026-09-05.json` | `/api/v1/schedule?sportId=1,51&date=2026-09-05&…&hydrate=team(leaders(…)),linescore(matchup,runners),flags,liveLookin,review,broadcasts(all),decisions,person,probablePitcher,stats,homeRuns,previousPlay,game(content(media(featured,epg)),summary),tickets),seriesStatus(useOverride=true)` — 15 games |
| `fixtures/raw/live-823823.json` | `/api/v1.1/game/823823/feed/live` — 85 plays, 339 pitch events with `pitchData.coordinates.pX`/`pZ` |
| `fixtures/raw/content-823823.json` | `/api/v1/game/823823/content?language=en` — 40 highlight items, `editorial.recap`/`preview`/`wrap` |

**Work**

0. Write `scripts/verify-S11.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S11.sh` performs)

1. `packages/mlb-api/` exists as a workspace package. This choice is **fixed** — do not put upstream types in `packages/domain/src/mlb/` (CLAUDE.md keeps upstream MLB types separate from BT product domain). It has **at least two** TypeScript modules split by concern (e.g. schedule vs live vs content).
2. The tree **exports named types** that cover:
   - schedule day: `gamePk`, teams, status, linescore summary fields used on today’s `ScheduleDay` / scoreboard
   - live feed: `gameData` status/teams/venue and `liveData.plays` / pitch events / linescore
   - game content highlights: `id`, `title`, `blurb`, playback URL
3. Grep of that tree finds **no** `: any`, `as any`, or `any[]` on carried files.
4. A named play-event type is exported (name contains `PlayEvent` or equals `LiveGamePlayEvent`) and a named play type references it as an array (not an inline anonymous object array).
5. `fixtures/raw/` contains the three committed payloads named in the Prerequisite (`schedule-2026-09-05.json`, `live-823823.json`, `content-823823.json`), unmodified.
6. A Vitest file in the new tree (or `packages/domain`) parses **each** of those three raw fixtures with **zod or valibot** (or a typed parse helper that **throws** on missing required fields) and exits 0 when run as a named file. The script fails if neither `zod` nor `valibot` appears in the parse path.
7. `GameSnapshot` remains defined in `packages/domain/src/types.ts` (or current domain types module) and is **not** re-exported as the upstream live-feed type from the MLB tree.
8. This file’s S11 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether modules are “intelligently” split vs a junk drawer of leftover types.
- Whether anonymous nesting stays within ~2 levels on files the script did not designate as the example. The script only enforces: ≥2 modules, a named play-event type, no `any`.

**Tightened (flagged)**

- Fixed the tree to `packages/mlb-api/` and required ≥2 modules (original said “prefer” a location, then allowed either tree — the open choice made the turn cap undefendable).
- Required zod **or** valibot to appear in the parse path (original allowed “typed parse helper” alone; the helper is still allowed **if** it throws, but the script also accepts zod/valibot — both remain valid).
- Required `fixtures/raw/` to exist with ≥1 file.

**Goal condition:** scripts/verify-S11.sh exits 0, pnpm verify exits 0, no files outside packages/mlb-api/, fixtures/raw/, pnpm-workspace.yaml, package.json, pnpm-lock.yaml, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — assumes the `packages/mlb-api/` workspace package (AC1 fixes that choice), one module per concern, and a parse test covering all three recorded payloads (AC6). Was 14 when AC6 asked for one fixture. If scaffolding the package eats more than ~4 turns, stop and re-cap rather than pushing on.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S11. Work item 0 first: if scripts/verify-S11.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S11.sh exits 0, pnpm verify exits 0, no files outside packages/mlb-api/, fixtures/raw/, pnpm-workspace.yaml, package.json, pnpm-lock.yaml, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S11.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S12 — Live HTTP `MlbStatsClient` + domain mappers

**Gap:** Only `FixtureMlbStatsClient` exists; no live Stats API adapter; fixtures are pre-normalized, not mapped from upstream.

**Depends on:** S11

**Scope files:** `functions/`, `packages/ports/`, `packages/domain/`, `packages/mlb-api/`, `fixtures/raw/`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S12.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S12.sh` performs)

1. `HttpMlbStatsClient` exists under `functions/src/adapters/` and is assignable to `MlbStatsClient` (`fetchSchedule` + `fetchGame`).
2. Its source (or a helper it calls) uses `https://statsapi.mlb.com` (or `https://statsapi.mlb.com/api/`) via `fetch` or `https` — checked by reading source, **not** by calling the network.
3. A comment or README sentence in Scope files states whether highlights come from the **content** endpoint or **live hydrate**.
4. Pure mapper modules exist (no `fetch`, no `fs`, no `https` in the mapper files) from upstream schedule/live(/content) → `ScheduleDay` / `GameSnapshot` (including `plays` when present in the fixture).
5. A unit test maps `fixtures/raw/live-823823.json` to domain fields and asserts: `gamePk` 823823, away/home `abbreviation` `CHC`/`MIA`, and ≥1 play with pitch coords. That test file exits 0 in isolation.
6. `functions/src/local-server.ts` still constructs `FixtureMlbStatsClient` by default. `HttpMlbStatsClient` is selected only when `BT_USE_LIVE_MLB=1` (or a documented equivalent the script greps for).
7. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (offline).
8. This file’s S12 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- A real HTTPS round-trip to MLB succeeding. The script must not hit the network and cannot prove the live client works on the wire.

**Scope corrected (widened 2026-09-06, authorised mid-run under rule 10)**

- `functions/src/` → `functions/`, plus `pnpm-lock.yaml`. AC1 requires `HttpMlbStatsClient` to consume `@bt/mlb-api`, so `@bt/functions` must declare the workspace dependency — impossible inside the original fence. S11 already carried `pnpm-lock.yaml` for the same reason; S12 omitting it was an oversight, not a constraint.

**Goal condition:** scripts/verify-S12.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/ports/, packages/domain/, packages/mlb-api/, fixtures/raw/, pnpm-lock.yaml, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S12. Work item 0 first: if scripts/verify-S12.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S12.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/ports/, packages/domain/, packages/mlb-api/, fixtures/raw/, pnpm-lock.yaml, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S12.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S13 — Expand MLB client: content, standings, players

**Gap:** v2 `MlbDataServer` also fetched content, standings, players; v3 port is schedule+game only. UI stories invent fixtures without a typed fetch path.

**Depends on:** S11, S12

**Scope files:** `packages/ports/`, `packages/mlb-api/`, `packages/domain/`, `functions/src/`, `fixtures/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S13.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S13.sh` performs)

1. `MlbStatsClient` (or a sibling port in `packages/ports/src/`) declares:
   - `fetchGameContent(gamePk)`
   - `fetchStandings(date)`
   - `fetchPlayers(ids)`
2. `FixtureMlbStatsClient` implements all three from committed JSON under `fixtures/`.
3. Named upstream types for those three endpoints live in the S11 tree and follow the same no-`any` + named-export rules as S11 checks 3–4.
4. Unit tests exist for each mapper (content → highlight list, standings → the domain shape S4 uses, players → identity/season bag) using fixtures only; those test files exit 0 in isolation; they do not call the network.
5. This file’s S13 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Live HTTP for the new endpoints (same as S12 — no network in the script).

**Goal condition:** scripts/verify-S13.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, packages/domain/, functions/src/, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S13. Work item 0 first: if scripts/verify-S13.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S13.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, packages/domain/, functions/src/, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S13.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S14 — Fixture recorder from live client

**Gap:** Fixtures are hand-curated; regenerating from MLB is tribal knowledge.

**Depends on:** S12 (S13 for standings/content fixtures)

**Scope files:** `functions/`, `README.md`, `fixtures/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S14.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S14.sh` performs)

1. `functions/package.json` (or root `package.json`) defines a `record-fixtures` (or documented equivalent) command. The entrypoint lives under `functions/` — **not** `scripts/`.
2. A unit test or dry-run function, given a fake `MlbStatsClient`, writes raw + normalized fixture-shaped JSON for a date and `gamePk` and asserts `FixtureMlbStatsClient` can load those ids. That test must not use the network. It may write only under a temp dir (`/tmp` or `os.tmpdir()`), not into committed `fixtures/` during the verify run.
3. `README.md` documents the command and states that CI / `pnpm verify` never requires network.
4. This file’s S14 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Running the recorder **with network** against live MLB and committing the resulting files. The script must not do that.

**Tightened (flagged)**

- Required the recorder entrypoint to live under `functions/` so `scripts/` stays frozen.
- Required the loadability check to use a fake client + temp dir (original allowed “running it with network”).

**Goal condition:** scripts/verify-S14.sh exits 0, pnpm verify exits 0, no files outside functions/, README.md, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S14. Work item 0 first: if scripts/verify-S14.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S14.sh exits 0, pnpm verify exits 0, no files outside functions/, README.md, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S14.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S15 — MLB API capability drift scanner

**Gap:** When Stats API adds fields/capabilities, nothing tells us. Development needs a repeatable “parse recent games → report unused/new paths” flow.

**Depends on:** S11 (path inventory against typed/known keys); better with S12/S14 for live/raw samples

**Scope files:** `functions/`, `packages/`, `README.md`, `CLAUDE.md`, `docs/v3/LOOP.md`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S15.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S15.sh` performs)

1. Root `package.json` has `mlb:scan-drift` (or documented equivalent). The entrypoint lives under `functions/` or `packages/` — **not** `scripts/`.
2. Default invocation loads committed raw fixtures (no network unless `BT_USE_LIVE_MLB=1`, which the verify script must not set).
3. A Vitest file: given a fixture clone with an injected unused key path, the scanner **reports that path**; given only known paths, the “new paths” section is empty and the run exits 0. That test file exits 0 in isolation.
4. At least two of `docs/v3/LOOP.md`, `CLAUDE.md`, `README.md` mention the scanner command and that it is part of the **dev update flow** after new fixtures / in season.
5. Either the fixture-based scan is invoked from a named script that exits 0 on committed fixtures, or `package.json` `verify` documents that scan as optional — the script checks one of those two recordings exists. Default CI remains offline (`.github/workflows/ci.yml` does not set `BT_USE_LIVE_MLB`).
6. This file’s S15 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether a reported path should become a type/story (triage). The script only checks that the scanner reports injected unknowns.

**Goal condition:** scripts/verify-S15.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/, README.md, CLAUDE.md, docs/v3/LOOP.md, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S15. Work item 0 first: if scripts/verify-S15.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S15.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/, README.md, CLAUDE.md, docs/v3/LOOP.md, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S15.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

## Live data plane — ADR-002 ingest + client freshness

Aligned with [ARCHITECTURE §1 / ADR-002](./ARCHITECTURE.md#1-foundational-data-topology-accepted-direction): MLB egress is **backend-only** and scales with **game windows**, not viewer count. Clients read **BT**. Live feel comes from **BT freshness + delivery** (poll, SSE, or WebSocket)—**not** per-tab MLB and **not** chatty direct Firestore listeners on hot `games/{gamePk}` docs as the default (Hosting/Functions read path; see locked service map).

```text
MLB  →  typed fetch (S11–S13)  →  project to BT store shapes (S21)
                                      │
                         cadence ingest (S16) / refresh-on-read (S17)
                                      │
                                      ├─ durable schedule / game / box / plays / media docs
                                      │
                                      └─ publish  →  BT SSE/WebSocket hub (S18)  →  watched UI (S19/S20)
```

### S21 — Project ingested MLB into durable BT store shapes

**Gap:** Today we mostly keep thin `GameSnapshot` / fixture JSON. Product needs **processed, BT-owned documents** derived from upstream (boxscore projection, play lists, media index, linescore, etc.) so UI and live delivery read a stable store—not raw Stats API trees.

**Depends on:** S11, S12 (S13 when projecting content/standings)

**Scope files:** `packages/domain/`, `functions/src/`, `docs/v3/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S21.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S21.sh` performs)

1. Pure projection module(s) exist (no `fetch` / `fs` / `https` in those files) that output **named** BT store types covering exactly these five (no additional documents in this story):
   - game header + status + teams + venue
   - linescore summary
   - plays / at-bats (reuse domain `AtBat` where fit)
   - boxscore batting/pitching tables **or** a typed stub document with ≥1 row per team derived from fixture raw data
   - highlights/media list when content is present in the input
2. A repository or unit-of-work API can persist those projections (memory adapter is enough). The ingest path calls project → upsert rather than spreading opaque upstream JSON into `GameSnapshot` only. The script greps `functions/src/services/ingest.ts` (or its replacement) for a `project` import/call.
3. A Vitest file: raw fixture → projections; asserts stable paths the UI will bind to: away/home abbreviations, play count, boxscore row count (≥1 per team). That file exits 0 in isolation.
4. Store shape is documented under a grepable heading `BT store shapes` in `docs/v3/ARCHITECTURE.md` **or** in `docs/v3/STORE-SHAPES.md`, listing the named types from check 1.
5. This file’s S21 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether this set of documents is the right long-term store (the script only checks the minimum named types and the documented heading).

**Tightened (flagged)**

- Required a grepable `BT store shapes` heading (original allowed “a short comment”).
- Fixed the projection set at exactly the five outputs in AC1 (original said “at least”, which left the turn cap undefendable).

**Goal condition:** scripts/verify-S21.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, docs/v3/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 14 — assumes exactly the five projection outputs listed in AC1 and a memory-adapter persist path. More documents than that is a different story.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S21. Work item 0 first: if scripts/verify-S21.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S21.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, docs/v3/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S21.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S16 — ADR-002 active-window ingest cadence loop

**Gap:** No worker ticks in-window games; store only fills on request/fixture seed.

**Depends on:** S12; **S21** for writing projections (not only raw snapshots); S7 helpful but memory repos OK for local/CI

**Scope files:** `packages/domain/`, `functions/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S16.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S16.sh` performs)

1. Lead, trail, and interval live in **one** module that exports `DEFAULT_CADENCE` (extend the existing export). Defaults are documented in that file (comment or named constants: `leadHours`, `trailHours`, and an `interval` / `intervalMs` field).
2. `tickIngest(now)` exists, selects schedule games in the active window, fetches via `MlbStatsClient`, runs S21 projections (or a test double of that project function), and upserts BT store docs with `fetchedAt` and `windowMode: "active"`.
3. A Vitest file with injected clock + fake MLB client: an in-window game’s projections are upserted on tick; a far out-of-window game is **not** fetched (fake client call count for that `gamePk` is 0). That file exits 0 in isolation.
4. `tickIngest` is exported for tests. If `pnpm dev` starts an interval, it is gated on an env flag (script greps `local-server.ts` for `tickIngest` and an env gate). Cloud Scheduler is out of scope.
5. `web/` does not import `HttpMlbStatsClient` or `statsapi.mlb.com` (script greps `web/`).
6. This file’s S16 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S16.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S16. Work item 0 first: if scripts/verify-S16.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S16.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S16.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S17 — Out-of-window refresh-on-read + single-flight

**Gap:** ADR-002 cache mode may refresh on read; stampede must not recreate shared-egress overload.

**Depends on:** S12; S16 optional

**Scope files:** `functions/src/`, `packages/domain/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S17.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S17.sh` performs)

1. Game and/or schedule read path: when `windowMode` is `"cache"` and data is missing or stale per a documented TTL exported from one module (named constant such as `CACHE_TTL_MS`), the path triggers **one** upstream refresh.
2. A unit test: N parallel reads for the same refresh key result in **exactly 1** upstream call (single in-flight promise). That file exits 0 in isolation.
3. Cooldown / rate-limit is a named documented constant. A test asserts a second refresh inside the cooldown does **not** re-hit upstream. That file exits 0 in isolation.
4. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (default fixture/local path stays offline-safe).
5. This file’s S17 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S17.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/domain/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S17. Work item 0 first: if scripts/verify-S17.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S17.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/domain/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S17.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S18 — BT-mediated live delivery (SSE/WebSocket port)

**Gap:** Clients cannot subscribe to “the game I’m watching” updating when BT state changes.

**Architecture constraints:** Delivery is **BT-mediated** (local Node / Cloud Functions URL or Hosting rewrite). Do **not** make the SPA listen directly to Firestore hot game docs as the primary path. Do **not** open MLB from the browser. Prefer a **port** (`GameLiveHub` / similar) so transport can be SSE or WebSocket behind an adapter.

**Depends on:** S16 (something to publish) or test double that publishes on upsert

**Scope files:** `packages/ports/`, `functions/src/`, `README.md`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S18.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S18.sh` performs)

1. A port named `GameLiveHub` (or documented equivalent in `packages/ports/src/`) exposes subscribe/unsubscribe by `gamePk` and publish of a snapshot (or versioned payload). An in-memory adapter exists for tests.
2. Local HTTP server exposes **one** of SSE or WebSocket (script greps README or handler for which) at e.g. `GET /api/games/:gamePk/live` and pushes when that game is upserted.
3. An integration test: open a subscription → upsert the game via repo/hub → client receives a payload containing a new `fetchedAt` or linescore field. No MLB network. That file exits 0 in isolation (ephemeral localhost server allowed).
4. `README.md` states that prod may keep short-poll as fallback and that push is the live UX path for a watched game.
5. `web/` does not import Firestore listeners on `games/` docs as the primary live path (script greps `web/` for `onSnapshot` / `games/` listener usage and fails if present).
6. This file’s S18 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S18.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, README.md, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S18. Work item 0 first: if scripts/verify-S18.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S18.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, README.md, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S18.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S19 — Web client auto-updates watched game

**Gap:** Game page is one-shot fetch; Live/Plays/etc. do not move when BT updates.

**Depends on:** S18

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S19.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S19.sh` performs)

1. Opening a game route subscribes to that `gamePk` via the BT live endpoint (`EventSource` or `WebSocket` — script greps `web/src/` for one of those and the live path).
2. A component or integration test with a mocked live stream delivers **two** payloads and asserts the Live tab (and header score/linescore at minimum) show the **second** score/inning without navigation. That file exits 0 in isolation.
3. Unmount / leaving the route unsubscribes: the same test (or a sibling) asserts `close()` / `abort` is called on unmount.
4. This file’s S19 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Required an unmount test that asserts `close()`/`abort` (original allowed “test or lint-proof pattern”).

**Goal condition:** scripts/verify-S19.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S19. Work item 0 first: if scripts/verify-S19.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S19.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S19.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S20 — Scoreboard live refresh for in-window games

**Gap:** Scoreboard is static after first load.

**Depends on:** S16 or S18 (poll BT schedule **or** subscribe to day channel—prefer poll of `/api/schedule` on an interval while page visible if day hub not built yet)

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S20.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S20.sh` performs)

1. `ScoreboardPage` (or its hook) refreshes schedule data on an interval while mounted. Interval is a named documented constant. Fetches go to the BT `/api/schedule` path only (script greps the page/hook: has interval + `/api/schedule`; has no `statsapi.mlb.com`).
2. Refresh is visibility-aware: source listens for `visibilitychange` or reads `document.hidden`, and a test asserts that when the document is hidden the interval does not fetch (or is cleared/paused).
3. A test: mock fetch returns two schedule payloads in sequence; after the refresh, rendered scores match the **second** payload. That file exits 0 in isolation.
4. This file’s S20 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Required a visibility test (original said “visibility-aware” without a check).
- Required BT `/api/schedule` only (original said “uses BT API only”).

**Goal condition:** scripts/verify-S20.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S20. Work item 0 first: if scripts/verify-S20.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S20.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S20.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### Later themes (not yet story-sliced)

Keep as themes until promoted; still architecture-aligned when sliced:

| Theme | Arch hook | Note |
|-------|-----------|------|
| Patreon OAuth link + entitlement refresh | ADR-004 | After S8 |
| Cloud-synced settings (patron) | FEATURES patronage | After S6 + S8 |
| Firebase Hosting/Functions deploy + Scheduler for S16 | ADR-005 / ADR-013 | Prod wiring of cadence |
| Cadence parameter tuning (lead/trail/interval) | ADR-002 open knobs | Config once S16 exists |
| Multi-source deep links Phase 1 | ADR-009 | |
| Impact Phase B / day digest | ADR-010 | |
| Inning insight feed + game package | ADR-011 | |
| FCM push notifications | FEATURES Later | Server transitions, not a substitute for S18 watched-game UX |

---

## Gap map (doc → story)

| Doc item | Stories |
|----------|---------|
| MLB upstream types + client + fixtures + drift | **S11–S15** (build first) |
| Ingest → durable BT projections | **S21**, then **S16–S17** |
| ADR-002 live delivery + watched UI | **S18–S20** |
| Scoreboard → game loop UI | S2–S3, S10, S19–S20 (**after** S21 shapes) |
| Standings | S4 (after S13 + S21) |
| Search | S5 |
| Settings | S6 |
| BT-backed data / ports | S7, S9 |
| Auth G3 | S8 (+ later Patreon) |
| Plays / pitch viz | Done at baseline |
| AI / multi-source / FCM push | Later themes |

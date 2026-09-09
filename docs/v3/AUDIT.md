# Baseball Theater v3 — verification ledger

The append-only record of **what was actually proven, and when**. Two kinds of entry, interleaved in chronological order:

| Entry | Written when | Answers |
|-------|--------------|---------|
| **Story** | A story in [BACKLOG](./BACKLOG.md) flips to `done` | Exactly which checks its grader ran, whether `pnpm verify` was green, and the commit the story shipped in |
| **Review** | A [backlog review](../../.claude/skills/backlog-review/SKILL.md) pass runs — triggered by event or by hand | HEAD, what triggered it, the verdict, and the findings |

`pnpm verify` proves the tree is healthy *right now* and forgets. The graders prove a story's acceptance criteria and then exit. This file is where both stop being ephemeral: a story with no entry here has no evidence it was ever verified, and a review with no entry here did not happen — the story counter that schedules the next review reads this file.

## How entries get written

**Never by hand.** `scripts/audit.sh` runs the real grader and the real `pnpm verify` and captures their output verbatim; a hand-written entry is indistinguishable from a fabricated one.

```bash
scripts/audit.sh story S14                # on completion: grader + pnpm verify
scripts/audit.sh story S14 --reverify     # re-run a shipped story later
scripts/audit.sh review --trigger "3 stories done since last review" \
                 --since "S23, S21, S13" --verdict amended --findings "…"
```

A story completion entry is written **before** the commit, so "shipped in the commit that adds this entry" resolves to the commit you are about to make. Commit the ledger entry with the story's code — a `done` story whose entry is uncommitted is not done ([BACKLOG](./BACKLOG.md) rule 6).

## Reading an entry

- **Shipped in** — the commit carrying the story's product code.
- **HEAD at capture** — where the tree stood when the checks ran. On a completion entry the tree is normally `dirty`: the story's work is staged but not yet committed. Only on a `--reverify` entry does this equal the shipping commit.
- **What was tested and verified** — the grader's own per-check lines (`scripts/lib/checks.sh`). This is the list of what a green exit code actually covered. A grader that reports 6/6 has proven six things and nothing else.
- **Verdict** (review entries) — `continue` · `amended` · `blocked`. `blocked` stops the loop.

## Gaps this file does not close

A grader proves its own checks. It does not prove the checks were the right ones. Entries below are evidence of what was verified, not a warrant that the story was well specified — that is the review entries' job.

<!-- entries below; newest last; appended by scripts/audit.sh -->

---

## 2026-09-08 — S1 verified (backfill, no grader)

**Domain window helpers fully tested *(pilot)***

| | |
|---|---|
| Entry | **backfill, reconstructed** — S1 predates both this ledger and the `scripts/verify-<ID>.sh` contract, so there is no grader to run. Nothing below is a captured run |
| Captured (UTC) | not captured — see the commits |
| Shipped in | `bff8f62` — Complete S1 window tests and require backlog status updates.<br>`e840939` — Tighten S1 window tests that Bugbot flagged as false confidence. |
| Grader | **none** — `scripts/verify-S1.sh` was never written |
| `pnpm verify` | green at those commits per CI; not re-captured here |

**What was tested and verified**

Unit tests in `packages/domain` over the window helpers, plus a fresh-context review pass (Bugbot) that rejected the first version of those tests as false confidence and forced `e840939`. There is no per-check record because there is no grader.

**Known gap:** S1 is the only `done` story with no grader. Its acceptance criteria live only in `BACKLOG.md` prose and in its tests. If S1's behaviour regresses, nothing under `scripts/` catches it *as an S1 failure* — only the domain suite inside `pnpm verify`.

---

## 2026-09-08 — S11 verified (backfill)

**MLB upstream payload types (carried loop)**

| | |
|---|---|
| Entry | **backfill** — this story shipped before the ledger existed. The grader run below is real and happened today, at the HEAD below, not at the shipping commit |
| Captured (UTC) | `2026-09-09T06:58:28Z` |
| Shipped in | `c375ad5` — S11: MLB upstream payload types for the carried loop. |
| HEAD at capture | `6c37778` (tree dirty) |
| Grader | `scripts/verify-S11.sh` — exit `0` |
| `pnpm verify` | not re-run for this entry — one repo-wide run covers the tree, recorded in the newest completion entry |

**What was tested and verified**

```
check 1 PASS: workspace package with >=2 concern-split modules
check 2 PASS: named exported types cover schedule / live feed / content
check 3 PASS: no `any` on carried files
check 4 PASS: named play-event type, referenced as an array (not inline)
check 5 PASS: the three recorded raw payloads, unmodified
check 6 PASS: a story-scoped Vitest file parses all three with zod/valibot
check 7 PASS: GameSnapshot stays a BT domain type
check 8 PASS: backlog status
```

**8/8 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S11 check results ---
check 1 PASS: workspace package with >=2 concern-split modules
check 2 PASS: named exported types cover schedule / live feed / content
check 3 PASS: no `any` on carried files
check 4 PASS: named play-event type, referenced as an array (not inline)
check 5 PASS: the three recorded raw payloads, unmodified
check 6 PASS: a story-scoped Vitest file parses all three with zod/valibot
check 7 PASS: GameSnapshot stays a BT domain type
check 8 PASS: backlog status
--- verify-S11: 8/8 checks passed ---
verify-S11: all checks passed
```

</details>


---

## 2026-09-08 — S12 verified (backfill)

**Live HTTP `MlbStatsClient` + domain mappers**

| | |
|---|---|
| Entry | **backfill** — this story shipped before the ledger existed. The grader run below is real and happened today, at the HEAD below, not at the shipping commit |
| Captured (UTC) | `2026-09-09T06:58:29Z` |
| Shipped in | `fac27e9` — S12: live HTTP MlbStatsClient + pure upstream mappers. |
| HEAD at capture | `6c37778` (tree dirty) |
| Grader | `scripts/verify-S12.sh` — exit `0` |
| `pnpm verify` | not re-run for this entry — one repo-wide run covers the tree, recorded in the newest completion entry |

**What was tested and verified**

```
check 1 PASS: HttpMlbStatsClient under adapters, assignable to MlbStatsClient
check 2 PASS: talks to statsapi.mlb.com via fetch/https (read source, no calls)
check 3 PASS: highlights provenance is stated in Scope files
check 4 PASS: pure mapper modules (no I/O) → ScheduleDay / GameSnapshot
check 5 PASS: named unit test maps the recorded live fixture to domain
check 6 PASS: fixtures stay the default; live client is opt-in
check 7 PASS: existing API tests still pass offline
check 8 PASS: backlog status
```

**8/8 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S12 check results ---
check 1 PASS: HttpMlbStatsClient under adapters, assignable to MlbStatsClient
check 2 PASS: talks to statsapi.mlb.com via fetch/https (read source, no calls)
check 3 PASS: highlights provenance is stated in Scope files
check 4 PASS: pure mapper modules (no I/O) → ScheduleDay / GameSnapshot
check 5 PASS: named unit test maps the recorded live fixture to domain
check 6 PASS: fixtures stay the default; live client is opt-in
check 7 PASS: existing API tests still pass offline
check 8 PASS: backlog status
--- verify-S12: 8/8 checks passed ---
verify-S12: all checks passed
```

</details>


---

## 2026-09-08 — backlog review (`amended`)

| | |
|---|---|
| Entry | backlog review pass |
| Captured (UTC) | `2026-09-09T06:58:31Z` |
| HEAD at review | `1f92c31` (tree dirty) |
| Trigger | story count — 3 `done` since work began (first review) |
| Stories `done` since last review | S1, S11, S12 |
| Verdict | `amended` |

**Findings / amendments**

Client data/state management was absent from the backlog entirely: no cache, no request dedup, no in-place patch, and the API boundary untyped at both ends (`sendJson(body: unknown)` on egress, caller-asserted `getJson<T>` on ingress).

Amendments:

- Accepted **ADR-014** (client state management) and **ADR-015** (API versioning + compatibility) in `docs/v3/ARCHITECTURE.md`.
- Inserted **S25**–**S28** and re-prioritized 14→28, so the typed route contract, the spec gate, and the query cache land before the UI fill stories (S2–S5) copy the ad-hoc `useEffect` + `fetch` pattern.

**Backfill note:** this entry reconstructs the review from the row logged in the `Backlog reviews` table in `BACKLOG.md` before this ledger existed. The review itself was real; the wording is carried over, not re-derived. The amendment was uncommitted at the time it was logged.

---

## 2026-09-08 — S23 verified (backfill)

**Full-fidelity upstream types (fixture coverage gate)**

| | |
|---|---|
| Entry | **backfill** — this story shipped before the ledger existed. The grader run below is real and happened today, at the HEAD below, not at the shipping commit |
| Captured (UTC) | `2026-09-09T06:58:31Z` |
| Shipped in | `e7abf5e` — S23: full-fidelity upstream types behind a fixture coverage gate. |
| HEAD at capture | `6c37778` (tree dirty) |
| Grader | `scripts/verify-S23.sh` — exit `0` |
| `pnpm verify` | not re-run for this entry — one repo-wide run covers the tree, recorded in the newest completion entry |

**What was tested and verified**

```
check 1 PASS: coverage helper with leafPaths + uncoveredPaths
check 2 PASS: coverage test + reasoned allowlist
check 3 PASS: every single-response raw fixture is covered
check 4 PASS: allowlist ceiling (<= 25 entries)
check 5 PASS: liveData.boxscore fully modeled
check 6 PASS: gameData branches + liveData leaders/decisions
check 7 PASS: no `any`; id-keyed escape hatches capped at 6
check 8 PASS: composition, not repetition
check 9 PASS: the package's own suite is green
check 10 PASS: backlog Status is done
```

**10/10 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S23 check results ---
check 1 PASS: coverage helper with leafPaths + uncoveredPaths
check 2 PASS: coverage test + reasoned allowlist
check 3 PASS: every single-response raw fixture is covered
check 4 PASS: allowlist ceiling (<= 25 entries)
check 5 PASS: liveData.boxscore fully modeled
check 6 PASS: gameData branches + liveData leaders/decisions
check 7 PASS: no `any`; id-keyed escape hatches capped at 6
check 8 PASS: composition, not repetition
check 9 PASS: the package's own suite is green
check 10 PASS: backlog Status is done
--- verify-S23: 10/10 checks passed ---
verify-S23: all checks passed
```

</details>


---

## 2026-09-08 — S21 verified (backfill)

**Project ingested MLB into durable BT store shapes**

| | |
|---|---|
| Entry | **backfill** — this story shipped before the ledger existed. The grader run below is real and happened today, at the HEAD below, not at the shipping commit |
| Captured (UTC) | `2026-09-09T06:58:32Z` |
| Shipped in | `6c37778` — S21: project ingested games into durable BT store shapes. |
| HEAD at capture | `6c37778` (tree dirty) |
| Grader | `scripts/verify-S21.sh` — exit `0` |
| `pnpm verify` | not re-run for this entry — one repo-wide run covers the tree, recorded in the newest completion entry |

**What was tested and verified**

```
check 1 PASS: pure projection module over named BT store types
check 2 PASS: a repository persists projections, and ingest projects
check 3 PASS: fixture → projections, on the paths the UI will bind to
check 4 PASS: the store shapes are written down
check 5 PASS: existing ingest/API behavior still holds
check 6 PASS: backlog Status is done
```

**6/6 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S21 check results ---
check 1 PASS: pure projection module over named BT store types
check 2 PASS: a repository persists projections, and ingest projects
check 3 PASS: fixture → projections, on the paths the UI will bind to
check 4 PASS: the store shapes are written down
check 5 PASS: existing ingest/API behavior still holds
check 6 PASS: backlog Status is done
--- verify-S21: 6/6 checks passed ---
verify-S21: all checks passed
```

</details>


---

## 2026-09-08 — S13 completed

**Expand MLB client: content, standings, players**

| | |
|---|---|
| Entry | story completion |
| Captured (UTC) | `2026-09-09T06:58:37Z` |
| Shipped in | the commit that adds this entry |
| HEAD at capture | `6c37778` (tree dirty) |
| Grader | `scripts/verify-S13.sh` — exit `0` |
| `pnpm verify` | exit `0` |

**What was tested and verified**

```
check 1 PASS: the port declares all three new methods
check 2 PASS: FixtureMlbStatsClient implements all three from fixtures/
check 3 PASS: named upstream types in the S11 tree, no `any`, coverage-gated
check 4 PASS: a mapper unit test per endpoint, fixtures only, green in isolation
check 5 PASS: the S11-tree suite stays green with the new types
check 6 PASS: backlog Status is done
```

**6/6 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S13 check results ---
check 1 PASS: the port declares all three new methods
check 2 PASS: FixtureMlbStatsClient implements all three from fixtures/
check 3 PASS: named upstream types in the S11 tree, no `any`, coverage-gated
check 4 PASS: a mapper unit test per endpoint, fixtures only, green in isolation
check 5 PASS: the S11-tree suite stays green with the new types
check 6 PASS: backlog Status is done
--- verify-S13: 6/6 checks passed ---
verify-S13: all checks passed
```

</details>

<details><summary><code>pnpm verify</code> (tail)</summary>

```
packages/domain typecheck$ tsc -p tsconfig.json --noEmit
packages/mlb-api typecheck$ tsc -p tsconfig.json --noEmit
packages/domain typecheck: Done
packages/mlb-api typecheck: Done
web typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck: Done
web typecheck: Done
functions typecheck$ tsc -p tsconfig.json --noEmit
functions typecheck: Done
Scope: 5 of 6 workspace projects
packages/domain build$ tsc -p tsconfig.json --noEmit
packages/mlb-api build$ tsc -p tsconfig.json --noEmit
packages/domain build: Done
packages/mlb-api build: Done
web build$ tsc -p tsconfig.json --noEmit && vite build
packages/ports build$ tsc -p tsconfig.json --noEmit
packages/ports build: Done
web build: vite v6.4.3 building for production...
web build: transforming...
web build: ✓ 775 modules transformed.
web build: rendering chunks...
web build: computing gzip size...
web build: dist/index.html                   0.78 kB │ gzip:   0.43 kB
web build: dist/assets/index-D-iiV6Iy.css  201.80 kB │ gzip:  29.51 kB
web build: dist/assets/index-Bjjn4IbQ.js   414.43 kB │ gzip: 131.06 kB
web build: ✓ built in 784ms
web build: Done
functions build$ tsc -p tsconfig.json --noEmit
functions build: Done
```

</details>

---

## 2026-09-09 — backlog review (`amended`)

| | |
|---|---|
| Entry | backlog review pass |
| Captured (UTC) | `2026-09-09T07:14:25Z` |
| HEAD at review | `a854c28` (tree dirty) |
| Trigger | 3 stories done since last review (S23, S21, S13) AND drift: S13 turn cap raised 16 to 24 mid-run; ADR-014 + ADR-015 accepted in 497d962 after the last review |
| Stories `done` since last review | S23, S21, S13 |
| Verdict | `amended` |

**Findings / amendments**

Fresh-context pass, no shared transcript with the agents that wrote S14/S15/S22.

**Trigger verified, not taken on faith.** Last review row in this ledger is at HEAD `1f92c31`
(since = S1, S11, S12). `git log 1f92c31..HEAD` = `497d962`, `e7abf5e` (S23), `6c37778` (S21),
`a854c28` (S13) — three `done` stories, so the count trigger is real. S13's turn cap note in
BACKLOG records the 16 -> 24 raise, so the drift trigger is real too. Two further drift events
found that were not on the pending list: ADR-014 and ADR-015 were accepted in `497d962`
(after the last review), and `packages/mlb-api/vitest.config.ts` coverage `include` changed
(`src/parse.ts` -> `src/parse.ts` + `src/coverage.ts`), which moves the `pnpm verify` gate.
Both are already carried: S24/S25/S26/S27/S28 cover the ADRs and appear in the Gap map;
the coverage widening is a tightening, not a loophole.

## Check 1 — coverage

No unowned gap found among the concerns the next three stories touch. Gap map rows exist for
every ADR accepted since the last review. Two negative findings recorded instead:

- Neither S22 (replay/diffPatch) nor S15 (drift scanner) has any anchor in `docs/v3/FEATURES.md`
  or `docs/v3/INTENT.md` — grep for `replay|time.machine|rewind|scrub` and `drift|scanner`
  returns nothing in FEATURES/INTENT. Both are justified only from ADR-002 cost reasoning and
  LOOP tooling. Not fatal, but it is why the prioritization challenge below moves them.
- `functions/package.json` declares `"seed": "tsx src/scripts/seed.ts"` and `functions/src/scripts/`
  has never existed (`git log --diff-filter=A -- functions/src/scripts/` is empty). Dead script
  that no story owned; folded into S14 AC1, whose fence already covers `functions/`.

## Check 2 — ground truth at HEAD `a854c28`

**S14 — Fixture recorder from live client (Priority 7).** Depends on S12, S13 — both `done`
(rows in this ledger). Scope files `functions/`, `README.md`, `fixtures/`, `docs/v3/BACKLOG.md`
all exist. AC1 target `functions/package.json` exists; `record-fixtures` absent, so the grader
is red-first as required. **Two blocking defects found:**

1. **AC2 was unsatisfiable inside the fence.** It required a fake `MlbStatsClient` to write
   "raw + normalized fixture-shaped JSON". `packages/ports/src/mlb.ts` declares the port as
   returning domain types only (`ScheduleDay`, `GameSnapshot`, `MediaHighlight[]`,
   `StandingsSnapshot`, `PlayerProfile[]`); `functions/src/adapters/http/mlb.ts` parses and maps
   upstream JSON internally and never surfaces it. No fake of that port can produce a raw payload.
   As written the story would have hit rule 10 and stopped, or widened its fence into
   `packages/ports/`. Amended into a two-seam AC2 (raw via injected `fetch`, reusing the existing
   `HttpMlbStatsClientOptions.fetchImpl`; normalized via a fake `MlbStatsClient`) plus a new AC4.
2. **AC1's "(or root `package.json`)" branch is a second fence trap** — root `package.json` is not
   in S14's Scope files. Branch removed.

Two further weaknesses, amended rather than blocked:

3. **The round-trip assert was trivially passable.** `FixtureMlbStatsClient.fetchSchedule` and
   `fetchStandings` (`functions/src/adapters/fixtures/mlb.ts`) `catch` a read failure and return an
   empty `games: []` / `divisions: []` shell. "asserts `FixtureMlbStatsClient` can load those ids"
   therefore passes against a recorder that wrote nothing. AC4 now demands `games.length > 0` and
   `divisions.length > 0`.
4. **Silent data loss on the game round-trip.** `fetchGame` builds `{ ...data, plays }` where
   `plays` comes from `loadPlays(gamePk)` reading a separate `plays-<gamePk>.json`. A recorder that
   inlines plays into `game-<gamePk>.json` round-trips to `plays: []` and the old AC would not
   notice — and the Plays tab is a working part of the carried loop. AC4 now demands
   `plays.length > 0` and AC2/AC4 require the normalized seam to emit `plays-<gamePk>.json`.
5. **Raw naming was unpinned.** `packages/mlb-api/src/coverage.test.ts` consumes
   `fixtures/raw/{schedule-<date>,live-<pk>,live-<pk>-base,content-<pk>,timestamps-<pk>,
   standings-<date>,people-<pk>}.json`, and S22's Prerequisite pins three of those by name. A
   recorder free to invent a layout orphans the S23 coverage gate and makes the S22 fixtures
   un-regenerable. New AC3 locks the names.
6. **Turn cap had no recorded assumption** (rule 12 requires one; the cap lived only inside the
   Goal condition). Raised 10 -> 14 with the assumption written out — the two-seam split is
   strictly more work than the single fake-client path 10 was sized against.

**S15 — MLB API capability drift scanner (was Priority 8).** Depends on S11, S23 — both `done`.
Reused primitive confirmed present: `leafPaths` / `uncoveredPaths` in
`packages/mlb-api/src/coverage.ts`, allowlist in `coverage-ignore.ts` (currently empty, ceiling 25).
`BT_USE_LIVE_MLB` in AC2 is the real flag (`functions/src/local-server.ts:21`,
`functions/src/adapters/http/mlb.ts`, asserted by `scripts/verify-S12.sh:95`).
`.github/workflows/ci.yml` confirmed not to set it, so AC5's CI clause holds at HEAD.
**One blocking defect:** AC1 requires the script on **root** `package.json` (and
`docs/v3/LOOP.md:101` already advertises `pnpm mlb:scan-drift`), but root `package.json` was not
in S15's Scope files — a guaranteed rule-10 stop on the story's first acceptance criterion.
Added to Scope files, Goal condition and `/goal` command. Also: `.github/` is named by AC5 but not
in scope; made explicit that it is read-only there. Cap 14 kept, assumption now recorded (rule 12).

**S22 — Post-game diffPatch capture + replay store (Priority 9).** Depends on S11, S12 — both
`done`. All three Prerequisite recordings exist: `fixtures/raw/timestamps-823823.json` (9.9 KB),
`live-823823-base.json` (236 KB), `diffpatch-823823.json` (5.9 MB), plus the `live-823823.json`
cross-check AC4(b) needs. `fixtures/raw` is in `.prettierignore` as the story claims.
`mapLiveFeed` exists at `functions/src/mappers/live.ts`. AC1's `fetchGameTimestamps` /
`fetchGameDiffPatch` are absent from `packages/ports/src/mlb.ts` and no `DiffPatch` type exists in
`packages/mlb-api/src/` — correctly red-first. **One gap:** `packages/mlb-api/src/coverage.test.ts`
excludes `diffpatch-823823.json` with the comment "the recorded replay envelope is a derived
artifact rather than one upstream response, so typing it belongs to the replay story" — S23 handed
that to S22 and S22's ACs did not carry it. Added as AC9. Offsetting credit noted: S23 already
landed `parseGameTimestamps` and the `timestamps-823823.json` coverage row, so cap stays 16. Also
noted that the AC4/AC5 tests must live under `functions/` (they need `mapLiveFeed`;
`packages/mlb-api` must not depend on `functions`).

**S16 — promoted into the next three (see check 3).** Depends on S12 and S21 — both `done`.
AC1's "extend the existing export" is real: `DEFAULT_CADENCE` is exported from
`packages/domain/src/window.ts:10`. Scope files `packages/domain/`, `functions/src/` are
sufficient for AC2–AC5 (`local-server.ts` and the memory repos are both under `functions/src/`).
No amendment needed.

## Check 3 — prioritization challenge

Kept S14 at 7, and the evidence says it should have been higher still: **two consecutive stories
had to route around its absence.** S13's "Needs human judgment" records "the recorder is S14" and
resolves by recording `standings-2026-09-05.json` / `people-823823.json` out of band; S22's
Prerequisite records three more fixtures "captured out-of-band ... (the Verify-script contract
forbids network and the recorder is S14)". A missing tool that forces a human `curl` twice is
under-prioritized by definition. It is next now; leaving it there.

Argued against S15 at 8 and moved it to 10. S23 already ships the drift primitive **and** gates it:
`coverage.test.ts` fails `pnpm verify` on any uncovered path in a committed fixture, so drift on
what we hold is already caught. S15's marginal value is scanning *freshly recorded* games, which is
a human triage flow with no FEATURES/INTENT anchor, and its own Depends-on line concedes it is
"better with S12/S14". Under rule 4 it is not the smallest thing moving the carried loop.
Counter-argument considered and rejected: pairing S15 immediately after S14 keeps
"record -> scan -> type" together, but that flow is already written down in `docs/v3/LOOP.md:101`
and can be built when a recording actually needs triage.

Promoted S16 to 8. It is the ADR-002 cadence spine the whole "Live data plane" section is built on
(S17, S18, S19, S20 all sit behind it), its dependencies S12 and S21 are `done`, and it is the only
one of these three with a product-doc anchor. S22 stays at 9 — ready to run, but a replay archive
whose prod target is still a Later theme.

No story found obsolete or quietly done by another. New order for the next three: **S14, S16, S22**.

## Systematic under-estimation

Answering the question the pending-drift list asked. S13's overrun was not "three endpoints is
more than 16 turns" — it was that the three endpoints were assumed comparable and were not
(standings 24 novel fields, people 2, content already built). The same shape is present in S14
(five endpoints, one raw seam and one normalized seam, unequal), which is why its cap moved to 14
with the assumption written down. S15 and S22 are single-mechanism stories and are not exposed to
the same error. The sharper finding is that **both fence bugs above were found by reading, not by
running** — the Scope-files lists were not derived from the ACs at authoring time. Recorded in the
BACKLOG scheduling notes for the next review to check.

## Amendments made to docs/v3/BACKLOG.md

- **S14** — AC1 rewritten (root-`package.json` branch dropped; dead `seed` script folded in);
  AC2 split into the two-seam form; AC3 pins the `fixtures/raw/` names; AC4 requires non-empty
  round-trip incl. `plays`; ACs renumbered to 6; `Turn cap:` line added, 10 -> 14; Goal condition
  and `/goal` command updated to 14.
- **S15** — root `package.json` added to Scope files, Goal condition and `/goal` command; AC5
  marks `.github/` read-only; new AC6 adds `packages/mlb-api` to the `CLAUDE.md` monorepo table
  (stale since `c375ad5`); `Turn cap:` assumption recorded.
- **S22** — new AC9 registers `fixtures/raw/diffpatch-823823.json` in `coverage.test.ts`; turn-cap
  note records the S23 credit and the test-placement constraint.
- **S4** — AC1 and AC3 moved off the nonexistent `fixtures/standings-2024-07-04.json` to the real
  recording `fixtures/standings-2026-09-05.json`; "Tightened" note updated, and a note added that
  `divisions[].name` is `null` in that recording while `divisions[].id` is populated, so AC2's
  "name/id" check must accept the id.
- **Story status table** re-sorted: S16 8, S22 9, S15 10. **Next** marker corrected from the
  stale "6 / S13" to "7 / S14". Backlog reviews scheduling notes rewritten.

Third pending-drift item (`packages/mlb-api` missing from `CLAUDE.md`) is resolved by S15's new
AC6 rather than by an edit here — `CLAUDE.md` is outside this review's write scope and inside S15's.

**Not blocked.** S14 is startable once this amendment is committed.

---

## 2026-09-09 — S14 completed

**Fixture recorder from live client**

| | |
|---|---|
| Entry | story completion |
| Captured (UTC) | `2026-09-09T07:21:01Z` |
| Shipped in | the commit that adds this entry |
| HEAD at capture | `a854c28` (tree dirty) |
| Grader | `scripts/verify-S14.sh` — exit `0` |
| `pnpm verify` | exit `0` |

**What was tested and verified**

```
check 1 PASS: functions/package.json exposes record-fixtures under functions/, dead seed script gone
check 2 PASS: two seams: raw driven by injected fetch, normalized driven by a fake MlbStatsClient
check 3 PASS: the raw seam writes the established fixtures/raw/<endpoint>-<key>.json names
check 4 PASS: a temp-dir Vitest round-trip proves non-empty schedule, standings and plays
check 5 PASS: README documents the command, both seams, and the no-network guarantee
check 6 PASS: backlog Status is done
```

**6/6 checks passed**

<details><summary>Grader output</summary>

```

--- verify-S14 check results ---
check 1 PASS: functions/package.json exposes record-fixtures under functions/, dead seed script gone
check 2 PASS: two seams: raw driven by injected fetch, normalized driven by a fake MlbStatsClient
check 3 PASS: the raw seam writes the established fixtures/raw/<endpoint>-<key>.json names
check 4 PASS: a temp-dir Vitest round-trip proves non-empty schedule, standings and plays
check 5 PASS: README documents the command, both seams, and the no-network guarantee
check 6 PASS: backlog Status is done
--- verify-S14: 6/6 checks passed ---
verify-S14: all checks passed
```

</details>

<details><summary><code>pnpm verify</code> (tail)</summary>

```
packages/domain typecheck$ tsc -p tsconfig.json --noEmit
packages/mlb-api typecheck$ tsc -p tsconfig.json --noEmit
packages/domain typecheck: Done
packages/mlb-api typecheck: Done
web typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck: Done
web typecheck: Done
functions typecheck$ tsc -p tsconfig.json --noEmit
functions typecheck: Done
Scope: 5 of 6 workspace projects
packages/domain build$ tsc -p tsconfig.json --noEmit
packages/mlb-api build$ tsc -p tsconfig.json --noEmit
packages/domain build: Done
packages/mlb-api build: Done
web build$ tsc -p tsconfig.json --noEmit && vite build
packages/ports build$ tsc -p tsconfig.json --noEmit
packages/ports build: Done
web build: vite v6.4.3 building for production...
web build: transforming...
web build: ✓ 775 modules transformed.
web build: rendering chunks...
web build: computing gzip size...
web build: dist/index.html                   0.78 kB │ gzip:   0.43 kB
web build: dist/assets/index-D-iiV6Iy.css  201.80 kB │ gzip:  29.51 kB
web build: dist/assets/index-Bjjn4IbQ.js   414.43 kB │ gzip: 131.06 kB
web build: ✓ built in 794ms
web build: Done
functions build$ tsc -p tsconfig.json --noEmit
functions build: Done
```

</details>

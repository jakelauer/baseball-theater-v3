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

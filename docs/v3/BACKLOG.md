# Baseball Theater v3 — Checkable backlog

**Purpose:** Turn [FEATURES](./FEATURES.md) + [ARCHITECTURE](./ARCHITECTURE.md) + [VISUAL-DESIGN](./VISUAL-DESIGN.md) into increments a loop can finish without a human “looks good” step.

**Rules for every story**

1. Acceptance criteria map to **commands, tests, or file invariants** (exit codes / assertions).
2. Vague phrases (“works correctly”, “handles errors gracefully”) are **forbidden** until rewritten.
3. Done means **`scripts/verify-<ID>.sh` exits 0** *and* **`pnpm verify` exits 0** *and* Status is `done` in this file (top table included) *and* the run is captured in [AUDIT](./AUDIT.md) via `scripts/audit.sh story <ID>`, committed with the code. An uncaptured green run leaves no evidence it happened.
4. Prefer the smallest story that moves the carried product loop forward. When UI and data-model work compete, **prefer MLB API + ingest/projection stories** — UI should follow how BT stores and organizes data. **Exceptions:** **S24** (brand theme), **S26** (typed API route contract), **S27** (spec + breaking-change gate), **S29** (generated client DAL), and **S25** (typed client query cache) run before UI fill stories **S2–S5** so new UI does not copy the night-park/teal scaffold ([VISUAL-DESIGN](./VISUAL-DESIGN.md)) or the ad-hoc `useEffect` + `fetch` pattern, and so every route added later is gated from birth ([ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) / [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted) / [ADR-016](./ARCHITECTURE.md#adr-016--generated-client-dal-from-the-openapi-spec-accepted)).
5. When starting a story, set its **Status** to `doing`. When all acceptance criteria pass, set it to `done` in this file in the same change set as the implementation (do not leave status stale). Keep the **Story status** table in sync (Status **and** sort by **Priority**).
6. **Do not start the next story/goal** until the finished story is **committed** (clean `git status` for that work, or an explicit commit SHA on the branch). Uncommitted “done” work blocks the next goal — reject moving on and commit (or ask the user to) first.
7. **First work item is always the grader.** Sub-item 0 writes `scripts/verify-<ID>.sh`. After that file exists, the rest of the story must not modify `scripts/` or `test/` (see Goal condition). Colocated `*.test.ts(x)` next to source are allowed when their directory is in `<paths>`.
8. Each story has a copy-paste **`/goal` command**. It points at `scripts/verify-<ID>.sh` instead of restating checks. Creating that one file (Work item 0) is the only allowed `scripts/` change; after it exists, do not edit `scripts/` or `test/`.
9. **Prove the grader red before green.** A run must execute the new `scripts/verify-<ID>.sh` against current HEAD and surface the nonzero exit *before* any product code is written. A grader first seen passing proves nothing: a weak script plus a weak implementation goes green and you learn nothing. (Only **S1** is exempt — it is already implemented, so its script must pass on HEAD.)
10. **The scope fence is hard.** If an acceptance criterion cannot be met inside a story’s **Scope files**, the run **stops and reports** the criterion and the path it needs. Widening the fence mid-run is never the agent’s call — the story was mis-scoped, so fix the story.
11. **Do not start a story while a backlog review is due.** Check [AUDIT](./AUDIT.md) and the [Backlog reviews](#backlog-reviews) scheduling notes first: due after **3** `done` stories since the last row, or immediately on a drift event. This is a sequencing gate like rule 6 — a due review blocks the next story the same way uncommitted work does.
12. **Every story ships a numeric turn cap.** `N` is not a cap. If a defensible number can’t be named, the story isn't bounded yet — fix the ambiguity (pick the tree, fix the document set, cut the scope) until it can be. Record the assumption the cap rests on next to it.

13. **`docs/v3/AUDIT.md` is always inside every story's fence.** The ledger entry ships in the same
    commit as the code (rule 3), so every story's **Scope files** and `/goal` path list include it —
    added to all `todo` stories on 2026-09-09. Written only by `scripts/audit.sh`, never by hand.

14. **If an acceptance criterion forces a new runtime dependency, the dependency manifests are in the fence.**
    Any story whose ACs require adding a package (a real SDK, a generator, a client lib) must list the
    manifest files that `pnpm install` will touch — the workspace `package.json` **and** root
    `pnpm-lock.yaml` — in its **Scope files**, Goal condition and `/goal` command. Three reviews running
    caught the same trap: S14 and S15 needed the root `package.json` for a new script; S7 needs
    `functions/package.json` + `pnpm-lock.yaml` for the Firestore SDK. Deriving the fence from the ACs at
    authoring time is the fix; this rule is the backstop. A story that hits an un-fenced manifest mid-run
    stops and reports (rule 10) — the story was mis-scoped.

15. **Every story states its Impact, right after Gap, in plain language.** One or two sentences a reader
    with no technical background can follow: what was true (the limitation/problem) before this story,
    and what's different after. Not a template — write the actual before/after, e.g. *"Before S17, an
    out-of-window game either served stale data forever or re-fetched from MLB on every view. S17 impact:
    stale games refresh once and cool down, so pages stay current without hammering MLB's servers."*
    This is documentation, not a graded AC — no `scripts/verify-<ID>.sh` checks it — but a [backlog
    review](#backlog-reviews) spot-checks that it exists and isn't jargon-only. It is the raw material for
    the story's `CHANGELOG.md` entry (rule 16); write it so that entry is nearly a copy-paste.

16. **A `done` story updates `CHANGELOG.md` in the same commit as its code (or its ledger entry, for a
    backfilled story).** `CHANGELOG.md` lives at the repo root — it is the **user-facing** counterpart to
    this file: impact-first headlines anyone can read, with a short **Details** line underneath naming the
    story ID (and ADR, if relevant) for readers who want the technical trail. Frame a dev-only change (a
    tooling fix, a coverage floor) by who it benefits and how — trust in the test suite, contributor
    experience — not just what changed. **Nest stories under a bold effort header** only when they are
    clearly part of one larger push that already has a header in the file; do not force nesting on an
    unrelated change. A story whose only outcome is an internal grader-script fix with nothing a reader
    outside the team would call an outcome may skip an entry — default to including one.

**Status legend:** `todo` · `doing` · `done` · `blocked`

### Verify-script contract

Every `scripts/verify-<ID>.sh` must:

- Exit **0** only when **every** acceptance-criterion check for that story holds; exit **nonzero** otherwise.
- **Report every check, not just the failures.** Source `scripts/lib/checks.sh`; declare each check up front with `check <id> "<description>"`; call `bad <id> "<reason>"` on failure; end with `report "verify-<ID>"` and `exit $?`. That prints one `check <id> PASS|FAIL: <description>` line per declared check plus a tally. A grader that prints only failures leaves no record of what a passing run actually proved, and `scripts/audit.sh` will fall back to recording its exit code alone — which is not an audit.
- Keep the `# --- Check <id>: <description> ---` section comment and the `check <id>` declaration in sync; the declared description is what lands in the ledger.
- **Fail against current HEAD** when the story’s product work does not exist yet (all `todo` stories today). Exception: **S1** is already implemented — its script must **pass** on current HEAD.
- Be deterministic and read-only toward the world: **no network**, **no writes outside the repo**, **no production** Firebase/MLB/Patreon. It must not write to the working tree (temp dirs under `/tmp` are fine). Localhost to an ephemeral server **started by a story-scoped Vitest file** is allowed; MLB, Firebase prod, and the public internet are not.
- Do its **own** checking. It must **not** invoke `pnpm verify`, repo-wide `pnpm test`, or `pnpm test:coverage`. It may run **named, story-scoped** Vitest files listed in that story’s checks.
- Finish in **under 60 seconds**.
- Be **demonstrated failing on HEAD first** (rule 9). This is a property of the run, not the file: write the script, run it, show the nonzero exit, then implement.

### Story status

Ordered by **Priority** (execution order). Story IDs (`S1`…`S29`) are stable labels, not rank.

| Priority | ID | Story | Status |
|----------|----|-------|--------|
| 1 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers fully tested *(pilot)* | `done` |
| 2 | [S11](#s11--mlb-upstream-payload-types-for-carried-loop) | MLB upstream payload types (carried loop) | `done` |
| 3 | [S12](#s12--live-http-mlbstatsclient--domain-mappers) | Live HTTP `MlbStatsClient` + domain mappers | `done` |
| 4 | [S23](#s23--full-fidelity-upstream-types-for-the-recorded-fixtures) | Full-fidelity upstream types (fixture coverage gate) | `done` |
| 5 | [S21](#s21--project-ingested-mlb-into-durable-bt-store-shapes) | Project ingested MLB into durable BT store shapes | `done` |
| 6 | [S13](#s13--expand-mlb-client-content-standings-players) | Expand MLB client: content, standings, players | `done` |
| 7 | [S14](#s14--fixture-recorder-from-live-client) | Fixture recorder from live client | `done` |
| 8 | [S16](#s16--adr-002-active-window-ingest-cadence-loop) | ADR-002 active-window ingest cadence loop | `done` |
| 9 | [S17](#s17--out-of-window-refresh-on-read--single-flight) | Out-of-window refresh-on-read + single-flight | `done` |
| 10 | [S22](#s22--post-game-diffpatch-capture--replay-store) | Post-game diffPatch capture + replay store | `done` |
| 11 | [S15](#s15--mlb-api-capability-drift-scanner) | MLB API capability drift scanner | `done` |
| 12 | [S7](#s7--firestore-adapter-behind-ports-emulator-ready) | Firestore adapter behind ports | `done` |
| 13 | [S30](#s30--restore-the-functions-branch-coverage-floor) | Restore the `functions` branch-coverage floor | `done` |
| 14 | [S24](#s24--brand-theme-tokens--system-color-mode) | Brand theme tokens + system color mode | `done` |
| 15 | [S26](#s26--typed-bt-api-route-contract) | Typed BT API route contract (`/api/v1`) | `todo` |
| 16 | [S27](#s27--openapi-spec-generated-from-the-contract--oasdiff-gate) | OpenAPI spec generated from contract + oasdiff gate | `todo` |
| 17 | [S29](#s29--generated-client-dal-from-the-openapi-spec) | Generated client DAL from the OpenAPI spec | `todo` |
| 18 | [S25](#s25--typed-client-query-cache-adr-014-foundation) | Typed client query cache (ADR-014 foundation) | `todo` |
| 19 | [S2](#s2--box-score-tab-renders-fixture-innings) | Box score tab renders fixture innings | `todo` |
| 20 | [S3](#s3--live-tab-shows-linescore--current-count-from-snapshot) | Live tab shows linescore + current count | `todo` |
| 21 | [S10](#s10--recap-tab-shows-editorial-blurb-from-fixture) | Recap tab shows editorial blurb | `todo` |
| 22 | [S4](#s4--standings-fixture-api--page) | Standings fixture API + page | `todo` |
| 23 | [S5](#s5--search-page-queries-highlights-fixture) | Search page queries highlights fixture | `todo` |
| 24 | [S18](#s18--bt-mediated-live-delivery-ssewebsocket-port) | BT-mediated live delivery (SSE/WebSocket port) | `todo` |
| 25 | [S19](#s19--web-client-auto-updates-watched-game) | Web client auto-updates watched game | `todo` |
| 26 | [S20](#s20--scoreboard-live-refresh-for-in-window-games) | Scoreboard live refresh for in-window games | `todo` |
| 27 | [S28](#s28--version-sunset-path-deprecation-headers--stale-client-upgrade) | Version sunset path + stale-client upgrade | `todo` |
| 28 | [S6](#s6--settings-page-persists-favorites-in-localstorage-free-tier) | Settings favorites in localStorage | `todo` |
| 29 | [S8](#s8--auth-ports-magic-link--passkey-verifier-stubs-for-local) | Auth ports: magic-link + passkey stubs | `todo` |
| 30 | [S9](#s9--align-pnpm-dev-with-emulator-story-document--smoke) | Align `pnpm dev` + smoke | `todo` |

**Next:** lowest **Priority** with Status `todo` — **13 / S30** — **after** confirming no [backlog review](#backlog-reviews) is due (this review just ran: S15 + S7 done since the last row, plus the `pnpm verify` coverage-gate drift; verdict `amended`, inserted S30).

When flipping Status, keep this table sorted by Priority. Do **not** have clients hit MLB or open unbounded Firestore listeners on hot game docs (ADR-002 cost path).

### Backlog reviews

`pnpm verify` proves the code is healthy; it says nothing about whether **this plan** is still right. Re-evaluate the backlog when review debt is due — **3** stories `done` since the last review entry in [AUDIT](./AUDIT.md), **or** any drift event (fence widened, turn cap hit, ACs rewritten mid-run, new ADR accepted, new workspace package, story inserted/re-prioritized outside a review, `pnpm verify` changed). Procedure: [`.claude/skills/backlog-review/SKILL.md`](../../.claude/skills/backlog-review/SKILL.md).

Run it with **fresh context** (separate agent/session — an agent that wrote these stories will confirm them), and do not start a story while a review is due. A `continue` verdict must cite the evidence from check 2; a review with no findings and no evidence counts as not having happened.

**The review log lives in [`docs/v3/AUDIT.md`](./AUDIT.md)**, interleaved with the story verification entries that define "3 stories since". Append to it with the script — never by hand:

```bash
scripts/audit.sh review --trigger "…" --since "S23, S21, S13" --verdict amended --findings "…"
```

This section keeps only the *forward-looking* scheduling state: what is due next, and the drift the next review has to weigh.

**Last review:** 2026-09-10 at HEAD `c98e435` — verdict `amended` (S15, S7 since the prior row; drift: **`pnpm verify` itself changed** — root `test:coverage` was rewired to actually propagate each package's coverage-threshold exit code, which it had never done before). Confirmed `@bt/functions` branches (54.07% vs 60%) and `@bt/web` lines/statements (2.65% vs 40%) both genuinely fail their declared floors — every prior ledger claim of "coverage floor held" was true only for lint/build/tests, not the threshold check itself. Decided, not deferred: inserted **S30** (Priority 13, cap 10) immediately ahead of S24 to close the `functions` gap with test-only changes (mostly `mappers/live.ts` + `mappers/schedule.ts`, both under 20% branch-covered); temporarily lowered `functions/vitest.config.ts` `branches` to 50 so `pnpm verify` is green in the interim, restored to 60 by S30. Re-baselined `web/vitest.config.ts` `lines`/`statements` to 2 (from 40) with a recorded rationale instead of assigning a story: the zero-tested surfaces (`GamePage.tsx`, `ScoreboardPage.tsx`, `SearchPage.tsx`, `SettingsPage.tsx`, `App.tsx`, `routes.tsx`, `api/client.ts`, most of `components/pitch/*`) are stubs S24/S25/S26/S29/S2–S5/S10 are all about to rewrite or fill in — retroactive tests now would be thrown away; each of those stories should raise the floor back toward 40 as it lands real tests, not just hold the lowered number steady. Ground-truthed S24/S26/S27 at HEAD (paths, route literals, dependencies) — all still hold; see [AUDIT](./AUDIT.md) check 2. Order **S30 → S24 → S26 → S27** confirmed (see check 3).

**Next review due:** S30 and S24 are both `done` since the last row (2 of the 3-story backstop) — one more (**S26**) trips it by count. Immediately on any drift event otherwise — in particular if `functions` branch coverage regresses, or if the `web` floor is touched by anything other than raising it as a page gains real tests, or on the rule-16 fence gap noted above. **Hard requirement carried forward: the review before S27 starts must re-decide the S27/S29 counterfactual** (S26 landing `/api/v1` + S27 touching `ci.yml` are themselves boundary-moving drift) — S26 is still ahead of it, so this has not yet come due.

**Pending drift for the next review to weigh:**

- **Resolved: the rule-16 fence gap.** Rule 16 (`CHANGELOG.md` in every `done` story's commit) was added without retrofitting `CHANGELOG.md` into any story's Scope files / Goal condition / `/goal` line — the same gap rule 13 closed for `docs/v3/AUDIT.md` on 2026-09-09. **S24 hit this and got it wrong first**: mid-run, the agent edited `CHANGELOG.md` outside S24's stated fence and rewrote S24's own Scope files to retroactively cover it — a live scope widen without asking, caught by the Stop hook holding the goal to its literal original text. Corrected: `CHANGELOG.md` reverted, S24's fence restored, S24 shipped without a changelog entry. **2026-09-13, user-directed:** every remaining `todo` story (S2, S3, S4, S5, S6, S8, S9, S10, S18, S19, S20, S25, S26, S27, S28, S29) had `CHANGELOG.md` added to its Scope files, Goal condition, and `/goal` line — confirmed 3/3 mentions each. S24's own changelog entry is still outstanding — write it as a small, explicitly-scoped follow-up (its fence now legitimately allows it).
- **Resolved: `functions` branch-coverage floor.** S30 restored `branches` to its real 60 (from the temporary 50); confirmed still 60 in `functions/vitest.config.ts` as of S24. No action needed.
- **`web` `lines`/`statements` floor is re-baselined to 2, on purpose, not a bug to "fix" by itself.** **S24 held it flat, as expected** — it's a theme-only change to `App.tsx`/`index.html`/`styles.css` with no page logic to test, so it correctly added no coverage. Still watching S25 (migrates `GamePage`/`ScoreboardPage` off hand-rolled fetch), S26/S29 (replace `api/client.ts`), and S2–S5/S10 (real tab content) — each of those should raise `lines`/`statements` back toward 40 as it lands tests for the page(s) it touches. If none of them raise it by the time S2–S5 all land, that is itself a finding for whichever review catches it.
- **`verify-S23.sh` check 7 description drift (found last review, not fixed — `scripts/` is frozen).** S22 raised the code ceiling to `-le 8` but the `check 7` declaration still reads "id-keyed escape hatches capped at 6", so the ledger records the wrong number. Fix belongs to an `scripts/audit.sh story S23 --reverify` with a one-line description sync, or the loop's code-review pass. Also: the hard numeric ceiling (`6`, now `8`) in a grader over a sibling package's internals is confirmed-fragile — it has been re-pressured by S22 and will break again on the next legitimate `Record<string,`. Consider converting it to an allowlist file (like `coverage-ignore.ts`) — needs a story or a contract note, not a drive-by.
- **`packages/ports` depends on `@bt/mlb-api`** (S22 AC1 — `fetchGameDiffPatch` returns `GameDiffPatchResponse`). Confirmed this review: type-only import, only in `packages/ports/src/mlb.ts`, does not touch `repositories.ts` / `auth.ts`; `MlbStatsClient` is already the explicit "upstream MLB Stats API–shaped client" so referencing upstream types rather than re-declaring them is consistent with CLAUDE.md's "keep upstream types separate". **Still open:** whether `fetchGameTimestamps` / `fetchGameDiffPatch` belong on `MlbStatsClient` or a sibling `GameReplayClient` port — revisit when S18 (`GameLiveHub`) or the replay-archival Later theme is sliced. Not blocking.
- **Manifest-fence trap — verify rule 14 holds.** S14, S15, S7 all hit it. S30 adds no dependency (test-only), so rule 14 does not apply to it. The next review must confirm rule 14 was applied to any new/edited story that adds a dependency (S26, S27, S29 already list their manifests; re-check on any insert).
- **S27 (OpenAPI spec + `oasdiff` gate) / S29 (generated DAL) — re-decide before S27 starts.** Still not re-litigated (S30, S24, S26 are all ahead of it). This review let the chain stand; the honest-accounting concern is unresolved: client and server are one monorepo sharing `@bt/domain` and an `as const` route table, so a breaking response change **already fails `pnpm verify`'s web typecheck** — `oasdiff` partly duplicates that, while S29's TS → JSON Schema → OpenAPI → TS round-trip adds fidelity-loss risk. Re-decide: (i) does S27 earn 16 turns + a committed generated artifact + a CI gate, or is ADR-014's direct `@bt/domain` ingress enough; (ii) if S27 stays, is S29 AC4 exhaustive enough to catch union-widening / branded-type / template-literal flattening, or does it need explicit negative (`@ts-expect-error`) cases.
- **S29's "enforced in CI" wiring** — requires a `web/` Vitest freshness test (regenerate → no diff) because `scripts/` and `.github/` are both outside S29's fence and the per-story grader is **not** a CI gate (`ci.yml` runs lint / test:coverage / build only). Confirm that test lands when S29 runs.
- **S25 coherence** — its dependency chain is 4 deep (S29→S27→S26→S21, plus S24) and now also implicitly depends on S30/whatever raises the `web` floor being resolved for its own new resource-module tests to count for something; re-check when S25 comes up.
- **Rule-12 turn-cap assumptions.** The next 3 (S30, S24, S26) all now carry one (S30 cap 10, S24 cap 10, S26 cap 14). Still missing from ~13 `todo` stories further down (S2, S3, S4, S5, S10, S18, S19, S20, S6, S8, S9). Sweep the next-3 for this each review.
- **Caps held.** S15 (16) and S7 (16) both completed with no cap breach and no mid-run ACs rewrite (ledger). No evidence of systematic underestimation in this batch.
- Story IDs now run to **S30**, priorities to 30 — checked this review: no `/goal` command conflates an ID with a priority number (priorities appear nowhere in the goal commands).

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
| Brand theme (VISUAL-DESIGN tokens + `auto` color scheme) | **Missing** — night-park/teal scaffold; see **S24** |
| MLB Stats API live client | **Missing** — fixtures only; `MlbStatsClient` is schedule+game |
| Upstream MLB TypeScript contracts | **Missing** — thin BT domain types only; no live-feed/content/standings payload types (raw payloads now committed under `fixtures/raw/`) |
| MLB API drift / new-field discovery | **Missing** — no scanner for unused paths in recent game payloads |
| ADR-002 ingest cadence worker | **Missing** — no scheduled in-window MLB→BT upsert loop |
| Out-of-window refresh-on-read / single-flight | **Missing** |
| BT API type contract | **Missing** — `sendJson(body: unknown)` on egress, `getJson<T>` caller-asserted on ingress; no route → response binding (see **S26**) |
| API versioning | **Missing** — routes are unversioned (`/api/schedule`); no OpenAPI spec, no breaking-change gate, no deprecation/sunset path (see **S26** / **S27** / **S28**, [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted)) |
| Client data/state layer | **Missing** — every page hand-rolls `useState` + `useEffect` + `fetch` + a `cancelled` flag; no cache, no dedup, no in-place patch (see **S25** / [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted)) |
| Client live delivery (BT SSE/WS/poll) | **Missing** — HTTP GET only; no watched-game push |
| Ingest → derived BT store projections | **Missing** — mostly pass-through snapshots; no first-class projection pipeline |
| Auth (magic link + passkeys) | Not started (`LocalAuthVerifier` exists, unwired; token prefix `local:` not `dev:`) |
| Firestore / Firebase Functions deploy | Not started (local Node API only) |
| Emulator-based `pnpm dev` | Partial (local API + Vite; not full Emulator Suite) |
| Multi-source deep links / AI / push | Not started |

---

## Stories

> **Route paths and ADR-015.** Stories authored before [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted) name unversioned routes (`/api/schedule`, `/api/games/:gamePk`, …). Once **S26** lands the `/api/v1` prefix, every such literal means its **`/api/v1/…`** equivalent — in the story text, in each `scripts/verify-<ID>.sh`, and in any new route a later story adds. A story that introduces a route on an unversioned path after S26 is wrong, not a permitted exception.

### S1 — Domain window helpers fully tested *(pilot)*

**Why first:** Tiny, no UI flake, teaches the verify loop.

**Impact:** Before S1, the logic deciding whether a game counts as "live" had no tests, so a bug there could silently break every later live-window feature. S1 impact: that logic is fully tested, so everything built on it afterward can trust it.

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

### S30 — Restore the `functions` branch-coverage floor

**Gap:** A 2026-09-10 backlog review found that root `pnpm test:coverage` was never actually enforcing each package's declared `coverage.thresholds` — the Vitest workspace/projects aggregator always exited 0 regardless (fixed in `c98e435`). With enforcement now real, `@bt/functions` fails its own `branches` floor: 54.07% measured against a declared 60% (`functions/vitest.config.ts`). The review temporarily lowered that number to 50 so `pnpm verify` is green again; that is debt, not a decision to run the package at a lower bar. The gap is concentrated in already-shipped pure mapper functions — `mappers/live.ts` (12.85% branch, 70 total branches) and `mappers/schedule.ts` (19.04%, 21 total branches) account for most of the ~152 uncovered branches, with smaller gaps in `mappers/content.ts`, `mappers/standings.ts`, `mappers/players.ts`, `services/recorder.ts`, and `handlers/api.ts`.

**Impact:** Before S30, the test-coverage bar for `functions` had been quietly lowered to paper over a real gap instead of closing it. S30 impact: the bar is back at its real level — closed honestly, by adding test cases for logic that already existed but was only tested on its "everything present" path.

**Why here:** Every later story's Goal condition requires `pnpm verify exits 0`; a temporarily-lowered threshold is not a stable floor to build on, and this gap is cheap to close with test cases alone (no design problem — the mappers already handle these branches, they're just unexercised). Runs immediately, ahead of **S24**, so the fudged number lives for the shortest possible time.

**Scope files:** `functions/src/`, `functions/vitest.config.ts`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`

**Work**

0. Write `scripts/verify-S30.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S30.sh` performs)

1. `functions/vitest.config.ts` declares `branches: 60` (the original floor the 2026-09-10 review temporarily lowered to 50 — restored here, not lowered further, and `lines`/`functions`/`statements` unchanged).
2. `pnpm --filter @bt/functions exec vitest run --coverage` exits 0 against that restored threshold.
3. No file under `functions/src/` outside `*.test.ts` differs from the commit that starts this story (the gap closes by adding test cases to existing pure functions, not by changing production logic, and not by excluding more files via `coverage.include`/`coverage.exclude`).
4. `mappers/live.ts` and `mappers/schedule.ts` — the two largest gaps at review time (70 and 21 total branches, both under 20% covered) — each individually clear 60% branch coverage in the same coverage run (grader reads the file-level coverage summary, not just the package total).
5. `pnpm verify` exits 0.
6. This file's S30 **Status** (story heading and top table) is `done`.

**Out of scope**

- Any change to what `functions`'s `branches` threshold means beyond restoring it to 60 — no raising past the original number, no touching `lines`/`functions`/`statements`, all of which already clear their floors today.
- `@bt/web`'s coverage floor — a separate, larger, and differently-shaped debt (mostly stub pages awaiting **S2–S5** and the query-cache/API migrations); the 2026-09-10 review re-baselined it instead of assigning a story (see the [Backlog reviews](#backlog-reviews) section).
- `packages/mlb-api` / `packages/domain` coverage — untouched by the drift this story pays down.

**Goal condition:** scripts/verify-S30.sh exits 0, pnpm verify exits 0, no files outside functions/src/, functions/vitest.config.ts, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 10 — assumes closing ~20 covered-branch points (331 total branches, need ~199 covered vs 179 measured at review time) is achievable by adding test cases to existing pure mapper functions and `handlers/api.ts`'s error paths, no source-level design changes. If closing the gap needs new branches in the source (refactoring for testability) rather than exercising branches that already exist, stop and report — that would make this a different, larger story.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S30. Work item 0 first: if scripts/verify-S30.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S30.sh exits 0, pnpm verify exits 0, no files outside functions/src/, functions/vitest.config.ts, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S30.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S24 — Brand theme tokens + system color mode

**Gap:** Scaffold still uses night-park CSS (`--bt-field` / clay / chalk), Mantine `primaryColor: "teal"`, hard-coded `defaultColorScheme="dark"`, and Fraunces headings — all of which fight [VISUAL-DESIGN](./VISUAL-DESIGN.md) §3–§4.

**Impact:** Before S24, the app wore a placeholder color scheme and font that were never meant to be the real look. S24 impact: the app switches to the real brand colors, fonts, and automatic light/dark mode, so every page built from here on starts on-brand instead of needing a redo later.

**Why here:** Runs after data/ports priorities and **before** UI fill (**S2–S5**) so new views copy the correct cascading theme, not teal/turf one-offs.

**Scope files:** `web/src/`, `web/index.html`, `docs/v3/BACKLOG.md`, `docs/v3/VISUAL-DESIGN.md`, `docs/v3/AUDIT.md`

**Work**

0. Write `scripts/verify-S24.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S24.sh` performs)

1. `web/src/styles.css` defines exactly these custom properties with these hex values (case-insensitive hex OK): `--bt-primary: #CE0F0F`, `--bt-dark: #211819`, `--bt-light: #FFF2D3`, `--bt-accent: #F5AD1D`, `--bt-accent-2: #72D991`.
2. `web/src/styles.css` does **not** define `--bt-field`, `--bt-clay`, or `--bt-chalk`, and does **not** contain a `radial-gradient` background on `body`.
3. `web/src/App.tsx` (or a theme module it imports under `web/src/`) sets Mantine `defaultColorScheme="auto"` and does **not** contain `primaryColor: "teal"` or `primaryColor: 'teal'`.
4. That same theme source anchors Mantine primary on `#CE0F0F` (string appears in the theme module — custom color scale or equivalent).
5. `web/src/App.tsx` theme does **not** set headings `fontFamily` to Fraunces; body/`fontFamily` includes `IBM Plex Sans`.
6. `web/index.html` does **not** load Fraunces; `theme-color` is `#211819` or `#FFF2D3` (not `#0b1f17`).
7. `web/src/pages/` and `web/src/layout/` contain **no** occurrences of the brand hexes `#CE0F0F`, `#211819`, `#FFF2D3`, `#F5AD1D`, `#72D991`, `#0b1f17`, or `#c45c26` (theme cascading — pages/layout use semantic Mantine roles, not paint chips). Pitch/data color strings under `web/src/components/pitch/` are exempt from this grep.
8. This file’s S24 **Status** (story heading and top table) is `done`.

**Out of scope**

- User-facing Light/Dark/System control in Settings (theme default is system/`auto`; a Settings toggle can ship later).
- Removing `AppShell` `navbar.breakpoint` / `hiddenFrom` (viewport chrome debt — later theme).
- Team colors on scoreboard modules; presentation-profile layer (explicitly **not** wanted).

**Needs human judgment**

- Whether Mantine’s generated primary scale looks right next to Accent / Accent 2 in real UI.

**Goal condition:** scripts/verify-S24.sh exits 0, pnpm verify exits 0, no files outside web/src/, web/index.html, docs/v3/BACKLOG.md, docs/v3/VISUAL-DESIGN.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself. Cap assumes theme swap only (no redesign of pages beyond dropping scaffold hex/gradients).

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S24. Work item 0 first: if scripts/verify-S24.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S24.sh exits 0, pnpm verify exits 0, no files outside web/src/, web/index.html, docs/v3/BACKLOG.md, docs/v3/VISUAL-DESIGN.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S24.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S26 — Typed BT API route contract

**Gap:** The response type is unbound at **both** ends of the wire, and routes are unversioned. Egress: `sendJson(res: ServerResponse, status: number, body: unknown)` in `functions/src/handlers/api.ts` erases the type, and nothing declares that `/api/games/:gamePk` returns a `GameSnapshot` — a handler can return the wrong shape and still typecheck. Ingress: `getJson<T>` in `web/src/api/client.ts` lets each caller assert whatever type it wants. Both sides import `@bt/domain`, so the *types* are shared, but no typechecked contract ties a route to its response.

**Impact:** Before S26, nothing actually checked that an API endpoint sent the shape of data it claimed to, and routes had no version number. S26 impact: a mismatch between what an endpoint sends and what a page expects is now caught before the code ever ships, and every route carries a version so a future change can't silently break something still depending on the old shape.

**Why here:** [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) requires data typed up to egress and typed again immediately on ingress, from one declaration. **S25** builds the query cache on top of that contract, so this lands first — otherwise the cache's payload types are asserted rather than derived. **S27** generates the OpenAPI spec by walking this table, which is why the table must be runtime-enumerable here. Independently valuable: it types today's two handlers before any cache exists.

**Why the version prefix lands now:** [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted) — versioning cannot be retrofitted without breaking. Once clients call `/api/schedule`, adding `/api/v1/schedule` *is* the breaking change. One path segment now buys the option permanently.

**Accepted scope of the guarantee:** JSON on the wire is untyped (a limitation of the medium). This story makes the boundary **statically** bound; it does **not** add runtime validation, and it does **not** make anything schema-first.

**Depends on:** S21 (so the contract names the BT store shapes, not pass-through snapshots)

**Scope files:** `packages/domain/`, `functions/src/`, `web/`, `firebase.json`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S26.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S26.sh` performs)

1. **One** shared module under `packages/domain/src/` declares the route table (exported name contains `ApiRoutes`) as a **runtime-enumerable `as const` value** — not a type alone — covering at minimum `GET /api/v1/schedule` → `ScheduleDay` and `GET /api/v1/games/:gamePk` → `GameSnapshot`, plus a named error-body type used by the 400/404 paths. Each entry's response type is bound through a `keyof`-constrained registry, so an unknown type key is a compile error (no unenforced string keys).
1b. **Every** route path in the table begins `/api/v1/`, and the script fails if any unversioned `"/api/<name>"` route literal remains in `functions/src/handlers/api.ts`, `web/src/`, or `web/vite.config.ts` proxy config.
2. Egress is typed: `functions/src/handlers/api.ts` no longer declares `body: unknown` on success responses, and its JSON sender is generic over the table (grep for the table's exported name in that file).
3. A **server** type-level test proves a wrong-shaped response fails typecheck: it contains `@ts-expect-error` on a bad send for a known route, and `pnpm --filter @bt/functions exec tsc -p tsconfig.json --noEmit` exits **0** (an unnecessary `@ts-expect-error` would make `tsc` fail, so exit 0 proves the binding is real).
4. Ingress is typed: `web/src/api/client.ts` exposes a fetch helper keyed by the route map, and **no** call site under `web/src/` passes a type argument (grep finds no `getJson<`).
5. Exactly **one** type assertion exists in the ingress path: `web/src/api/client.ts` contains at most **1** occurrence of `as ` / `as unknown as`, and no other file under `web/src/api/` contains one.
6. A **client** type-level test proves the derived type is enforced: `@ts-expect-error` on assigning a route's response to a wrong type, with `pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit` exiting **0**.
7. **No runtime validation added** at this boundary (recording the ADR-014 decision): the script greps `functions/src/handlers/api.ts` and `web/src/api/` and fails if `zod` or `valibot` is imported. `@bt/mlb-api` parsers are untouched and out of scope.
8. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (existing API behavior unchanged).
9. This file's S26 **Status** (story heading and top table) is `done`.

**Out of scope**

- The query cache itself (S25).
- Runtime response validation, and any schema-first rewrite of BT store shapes — explicitly rejected in ADR-014.
- New routes. This story types the routes that exist; S4/S5/S13 add their own entries to the map when they land.

**Needs human judgment**

- Whether the map's ergonomics hold up as routes with params multiply (the script only checks the two current routes are bound).

**Goal condition:** scripts/verify-S26.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, web/, firebase.json, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 14 — assumes one route table, one typed sender, one typed fetch helper, two type-level tests, the `/api/v1` path move, and no new routes. Was 12 before ADR-015 added the version prefix (which touches the handler paths, the Vite proxy, and existing call sites). If typing the existing handlers forces layout changes under `web/src/pages/`, stop and report: that is S25's job.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S26. Work item 0 first: if scripts/verify-S26.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S26.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, web/, firebase.json, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S26.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S27 — OpenAPI spec generated from the contract + oasdiff gate

**Gap:** Nothing describes the BT API outside TypeScript, and nothing mechanically blocks a backward-incompatible change. [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted) makes additive-only within a version the rule; without a gate it is a wish.

**Impact:** Before S27, there was no description of the app's API outside its own source code, and nothing stopped a change from silently breaking anyone relying on it. S27 impact: a machine-readable spec is generated automatically from the real API, and a check blocks any change that would break compatibility for existing clients.

**Why here:** Directly after **S26**, because the spec is generated by walking that story's runtime route table. Landing it before the UI fill stories means every route added later (S4 standings, S5 search, S13) is gated from birth.

**Single source:** the spec is a **derived artifact**, never hand-edited. The TypeScript contract stays authoritative — this story adds no second source of truth and no runtime validation.

**Depends on:** S26

**Scope files:** `packages/domain/`, `functions/`, `package.json`, `pnpm-lock.yaml`, `openapi/`, `.github/workflows/`, `README.md`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S27.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S27.sh` performs)

1. A generator entrypoint exists under `functions/` or `packages/` (**not** `scripts/`), wired to a root `package.json` script such as `api:spec`. It uses **`ts-json-schema-generator`** for response schemas and an in-repo emitter that walks the S26 route table. `ts-oas` is **not** used (ADR-015 rejects it: it would dictate domain type shapes).
2. The generated spec is committed at `openapi/bt-api.v1.json` (or `.yaml`), is valid JSON/YAML, declares `openapi: 3.x`, and contains a path entry for **every** route in the S26 table — the script cross-checks the table's route count against the spec's operation count.
3. Each operation's success response `$ref`s a component schema whose properties include the payload's fields (the script spot-checks `fetchedAt` and `windowMode` on the game and schedule responses).
4. **The spec is not stale:** re-running the generator into a temp dir produces a file byte-identical to the committed one (the script regenerates and diffs). No network.
5. `oasdiff` is available as a repo dev dependency (`oasdiff-js` or a pinned binary) and a root script such as `api:breaking` runs it with `--fail-on ERR` against a committed baseline.
6. The gate is proven to work in **both** directions, offline, by a named test or the script itself: an unmodified spec → exit 0; a spec fixture with a **removed response field** → nonzero with a breaking-change finding. The mutated fixture lives in a temp dir, not in `openapi/`.
7. `.github/workflows/ci.yml` runs the spec-freshness check and the breaking-change gate. CI stays offline — the script fails if the workflow adds a step that fetches a spec over the network.
8. `README.md` documents: regenerate with `pnpm api:spec`, the spec is generated and never hand-edited, additive-only within `v1`, and a breaking change means a new version per ADR-015.
9. This file's S27 **Status** (story heading and top table) is `done`.

**Out of scope**

- Publishing the spec anywhere (docs site, Swagger UI) — ADR-015 "Still open".
- Client or server code generated *from* the spec. Generation flows one way: TypeScript → spec.
- Runtime request/response validation (rejected in ADR-014).
- Creating a v2, or multi-version mounting (ADR-015 non-goal until v2 exists).
- Semantic breaking changes — a field whose meaning changes while its shape does not. ADR-015 names this as unreachable by tooling; do not claim the gate covers it.

**Needs human judgment**

- Whether `oasdiff` severity tuning (which `WARN`s to promote to `ERR`) matches how the team wants to be interrupted.
- Whether the emitter's operation ids, descriptions, and error responses are good enough to hand to a human reader.

**Goal condition:** scripts/verify-S27.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/, package.json, pnpm-lock.yaml, openapi/, .github/workflows/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — assumes the S26 route table is enumerable, one generator + emitter, one committed spec, and the oasdiff wiring. **Note:** this story edits `.github/workflows/ci.yml`, which normally requires asking first ([CLAUDE.md](../../CLAUDE.md)) — AC 7 is that authorization, scoped to adding the two checks. If the oasdiff binary cannot install offline in CI, stop and report rather than adding a network step to the verify path.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S27. Work item 0 first: if scripts/verify-S27.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S27.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/, package.json, pnpm-lock.yaml, openapi/, .github/workflows/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S27.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S29 — Generated client DAL from the OpenAPI spec

**Gap:** S27 commits `openapi.json` as a derived artifact that **nothing consumes**. `oasdiff` only compares the spec against its own previous self, never against reality — so a route the emitter under-specifies (a dropped field, wrong nullability, a widened union) passes the gate forever and stays wrong. Meanwhile the web client hand-writes its fetch layer against the TS table, so nothing ever forces the spec to be right.

**Impact:** Before S29, the API spec generated by S27 had nothing actually reading it, so an inaccuracy could sit undetected forever. S29 impact: the web app's data-fetching code is generated directly from that spec, so the spec has to stay accurate or the app itself won't build — closing the loop S27 opened.

**Why here:** After **S27** (needs the committed spec) and **before S25**, so the query cache is built on the generated DAL instead of hand-writing an ingress layer that this story would immediately replace. [ADR-016](./ARCHITECTURE.md#adr-016--generated-client-dal-from-the-openapi-spec-accepted) records the round-trip decision and the fidelity guard that makes it acceptable.

**Depends on:** S26 (runtime-enumerable route table), S27 (committed spec + `oasdiff` gate)

**Scope files:** `web/`, `package.json`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Note on the generator command:** it must be a `package.json` script (or config under `web/`), **not** a new file under `scripts/` — that directory is frozen after work item 0.

**Work**

0. Write `scripts/verify-S29.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S29.sh` performs)

1. `web/package.json` depends on `openapi-typescript` and `openapi-fetch`. A `package.json` script regenerates the DAL from the committed spec **with no network** (the grader runs it offline).
2. Generated output lives under `web/src/api/generated/`, is committed, and every file there carries an `@generated` banner in its first 5 lines. The script fails if any file in that directory lacks one.
3. **Drift gate:** running the generator produces **no diff** under `web/src/api/generated/` (`git diff --exit-code` on that path). A stale committed artifact fails the story. This regenerate-then-compare check **also runs as a `web/` Vitest test** (in `pnpm verify` / `pnpm test:coverage`'s path), because ADR-016 requires spec→client freshness *enforced in CI* and both `scripts/` and `.github/` are outside this story's fence — the per-story grader is not a CI gate (`ci.yml` runs lint / test:coverage / build only).
4. **Fidelity gate (the load-bearing check):** a type-level test asserts that for **every** route in the S26 table, the generated response type and the corresponding `@bt/domain` type are **mutually assignable** (assignable both directions, not merely compatible one way). `pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit` exits **0**. This is what catches round-trip fidelity loss; without it the story is not done.
5. `web/src/api/` consumes the generated client: **no** hand-written route path literal (`"/api/v1/`) appears anywhere under `web/src/` outside `web/src/api/generated/`.
6. Grep of `web/src/api/` **excluding** `generated/` finds no `: any`, `as any`, `any[]`, or `as unknown as`.
7. **No runtime validation** added at this boundary (ADR-014 and ADR-016 both reject it): no `zod` or `valibot` import under `web/src/api/`.
8. `pnpm --filter @bt/web exec vitest run` exits 0 (existing web tests still pass).
9. This file's S29 **Status** (story heading and top table) is `done`.

**Out of scope**

- The query cache and its descriptors — **S25** owns those, and consumes what this story generates.
- Generating **query hooks** (ADR-016 rejects Orval for exactly this reason).
- Generating the **server** from the spec. The route table stays the origin.
- Fixing the emitter. If the fidelity gate in AC 4 fails because the spec genuinely under-specifies a route, that is **S27's** bug — stop and report it rather than patching the generated output or loosening the assertion.

**Needs human judgment**

- Whether `openapi-fetch`'s ergonomics hold up for routes with path params once more than the two current routes exist.
- Whether the fidelity assertion should stay exhaustive over the route table, or move to a sampled set if the table grows large.

**Goal condition:** scripts/verify-S29.sh exits 0, pnpm verify exits 0, no files outside web/, package.json, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — assumes two dependencies, one generator script, one generated module tree, the drift check, and a fidelity assertion covering the routes the table holds when this runs (two, per S26). Assumes **no** page migrations: those are S25's. If the spec under-specifies a route and AC 4 cannot pass without changing the emitter, stop and report — that is a different story.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S29. Work item 0 first: if scripts/verify-S29.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S29.sh exits 0, pnpm verify exits 0, no files outside web/, package.json, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S29.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S25 — Typed client query cache (ADR-014 foundation)

**Gap:** Every page hand-rolls `useState` + `useEffect` + `fetch` + a `cancelled` flag ([web/src/pages/GamePage.tsx](../../web/src/pages/GamePage.tsx), [web/src/pages/ScoreboardPage.tsx](../../web/src/pages/ScoreboardPage.tsx)); `web/src/api/client.ts` is two bare functions. There is no cache, no dedup, and **no way to patch a loaded entity in place** — which S19/S20 both require and [VISUAL-DESIGN D7](./VISUAL-DESIGN.md#1-design-goals) mandates. [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) settles the strategy; this story lands the foundation for the **server read cache** kind only.

**Impact:** Before S25, every page fetched its own data independently with no shared cache — the same game could be fetched twice, and there was no way to update what's on screen without a full reload. S25 impact: pages share one typed cache that can be updated in place, the groundwork live updates need so a screen refreshes without losing where you were.

**Why here:** After **S21** so cache keys mirror real BT store shapes rather than pass-through `GameSnapshot`, and after **S24** so the migrated pages inherit the brand theme. **Before S2–S5** so four new surfaces consume the cache instead of adding four more `useEffect` fetchers, and **before S18–S20** so live delivery has a typed cache-write seam instead of inventing one.

**Depends on:** S29 (generated client DAL — descriptors derive their payload type from it), S26 (route contract, via S29), S21 (store shapes), S24 (theme)

**Scope files:** `web/`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S25.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S25.sh` performs)

1. `web/package.json` depends on `@tanstack/react-query` (major **5** or later), and a module under `web/src/` mounts `QueryClientProvider` (grep).
2. `web/src/api/` has **one file per resource** — at minimum `game.ts` and `schedule.ts` — and each exports a **`queryOptions(`** descriptor plus a hook named `useGame` / `useScheduleDay` (grep each file).
3. Those descriptors **derive** their payload type from the **S29 generated client** under `web/src/api/generated/` (grep the resource files for an import from that directory — never a locally written shape, and no longer a direct `@bt/domain` import at ingress; see [ADR-016](./ARCHITECTURE.md#adr-016--generated-client-dal-from-the-openapi-spec-accepted)). **No** file under `web/src/` declares an `interface` or `type` body containing `windowMode` or `fetchedAt` — server shapes are not re-declared client-side (ADR-014 rule 9).
4. A colocated type-level test under `web/src/api/` proves a **wrong-typed cache write fails typecheck**: it contains `@ts-expect-error` on a bad `setQueryData` call, and `pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit` exits **0**. (If the bad write were legal, the unused `@ts-expect-error` directive makes `tsc` fail — so exit 0 proves the key is genuinely bound to its payload type.)
5. Grep of `web/src/api/*.ts` finds **no** `: any`, `as any`, `any[]`, or `as unknown as`.
6. `web/src/pages/` and `web/src/components/` contain **no** `fetch(`, **no** `setQueryData(`, and **no** raw key arrays (`["game"`, `['game'`, `["schedule"`, `['schedule'`). Cache writes live only under `web/src/api/`.
7. `GamePage.tsx` and `ScoreboardPage.tsx` contain **no** `cancelled` flag and each calls its hook (`useGame(` / `useScheduleDay(`).
8. Freshness is server-declared: one exported policy function (e.g. `freshnessPolicy`) references `windowMode`, and **both** resource descriptors call it. No numeric `refetchInterval` / `staleTime` literal appears outside that policy module.
9. A web RTL/Vitest file asserts, offline, that (a) two components reading the same `gamePk` both update from **one** cache write, and (b) that write does **not** remount — local state in a child (standing in for an open at-bat) survives it. Exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
10. `pnpm --filter @bt/web exec vitest run` exits 0 (existing `StandingsPage.test.tsx` still passes).
11. This file's S25 **Status** (story heading and top table) is `done`.

**Out of scope**

- Settings store (S6 owns it; ADR-014 rule 6 governs the shape).
- Session / entitlements provider and entitlement-driven cadence (S8 + ADR-004).
- SSE/WebSocket subscription itself (S18/S19) — this story only provides the typed write seam.
- The **route contract** itself — **S26** owns it (it spans `packages/domain` + `functions/`, outside this story's `web/`-only fence). S25 consumes it. Runtime response validation is rejected outright in ADR-014; do not add a client-only schema here.
- Replay scrub controller (ADR-014 non-goal).

**Needs human judgment**

- Whether the layer actually reads as "intuitive and easy to debug" — the script enforces one-file-per-resource, named hooks, no indirection, and no stray writes, but not whether a newcomer finds it obvious.
- Whether devtools placement/config is right in dev builds.

**Goal condition:** scripts/verify-S25.sh exits 0, pnpm verify exits 0, no files outside web/, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 18 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 18 — assumes the provider, two resource modules, one freshness-policy module, migrating exactly the two existing pages, one type-level test, and one behavior test. Adding a third resource, or touching S18 transport, is a different story. If migrating the two pages eats more than ~6 turns, stop and re-cap.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S25. Work item 0 first: if scripts/verify-S25.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S25.sh exits 0, pnpm verify exits 0, no files outside web/, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S25.sh, or stop after 18 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S2 — Box score tab renders fixture innings

**Gap:** Game → Box is a stub; FEATURES carries box score.

**Impact:** Before S2, the Box Score tab on a game page was an empty placeholder. S2 impact: opening a game's Box Score tab shows real inning-by-inning batting and pitching lines for that game.

**Prefer after:** **S21** (and S11 types) so the box tab binds to stored BT boxscore projection, not a one-off fixture shape. **Also prefer after S24** so the box UI inherits the brand theme, and **S25** so the tab reads the game through `useGame` rather than another page-level fetch.

**Scope files:** `fixtures/`, `packages/domain/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S2.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S2.sh` performs)

1. The committed game payload for `744834` (`fixtures/game-744834.json` or a file the API merges into that game) includes a `boxscore` object.
2. `boxscore.teams.away.batting` and `boxscore.teams.home.batting` are arrays with length ≥ 1 each. Each entry has a player identifier (`id` number or `name`/`fullName` string).
3. An in-process `GET /api/games/744834` (story-scoped functions test, same pattern as `functions/src/handlers/api.test.ts`) returns 200 and the JSON includes that `boxscore` with the same batting-length invariant.
4. A web RTL/Vitest file exists that renders the Game **box** tab for fixture `744834` and asserts the away abbreviation `NYM` and home abbreviation `WSH` appear **inside the box tab panel** (not only the page header that already shows `NYM @ WSH`).
5. That web test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
6. Under `web/src/`, files this story adds or that implement the box tab contain **no** team-logo image URLs (no `mlbstatic` logo paths, no `/logos/` image refs) and **no** `<img` used as a team mark.
7. Those same box UI files do **not** call `useMediaQuery` and do **not** use Mantine `hiddenFrom` / `visibleFrom` to choose layout (variant ⊥ viewport — [VISUAL-DESIGN](./VISUAL-DESIGN.md) §5). Existing `AppShellLayout.tsx` chrome is out of scope for this check.
8. This file’s S2 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether the box table is visually readable (column layout, wrapping). The script only checks data presence and abbreviations in the box panel.

**Tightened (flagged)**

- Replaced “boxscore (or equivalent domain type)” with a required JSON field `boxscore` and path `boxscore.teams.{away,home}.batting[]`.
- Required batting entries to carry `id` or `name`/`fullName`.
- Required abbreviations to be asserted in the **box panel**, because the header already renders them today (a header-only test would pass on HEAD).
- Added VISUAL-DESIGN constraints: no logos; no viewport-query layout brain in box UI.

**Goal condition:** scripts/verify-S2.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S2. Work item 0 first: if scripts/verify-S2.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S2.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S2.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S3 — Live tab shows linescore + current count from snapshot

**Gap:** Live tab is incomplete: inning / inning state / outs render; balls and strikes do not; no component test.

**Impact:** Before S3, the Live tab showed the inning and outs but not the ball-strike count — no way to tell 0-2 from 3-0. S3 impact: the Live tab shows the full count, the detail a fan actually watches a live at-bat for.

**Prefer after:** **S24** (brand theme in place before live UI polish) and **S25** (the live panel reads the cached game, so S19 can patch it in place).

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

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
5. Live UI files under `web/src/` that this story adds or edits contain **no** team-logo `<img` / `mlbstatic` logo paths, and do **not** call `useMediaQuery` or use `hiddenFrom` / `visibleFrom` to choose layout (`AppShellLayout.tsx` exempt).
6. This file’s S3 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Visual placement of the count vs the rest of the live panel.

**Tightened (flagged)**

- Bound the five fields to fixture `744834`’s actual values (`9`, `End`, `3`, `0`, `0`).
- Required a labeled balls/strikes count so the existing header `0 – 1` cannot satisfy the check.
- Required the assertions to target the **live panel** (inning/state/outs already render there; balls/strikes do not).
- Added VISUAL-DESIGN constraints: no logos; no viewport-query layout brain in live UI.
**Goal condition:** scripts/verify-S3.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S3. Work item 0 first: if scripts/verify-S3.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S3.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S3.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S4 — Standings fixture API + page

**Gap:** Standings stub; FEATURES carries standings.

**Impact:** Before S4, the Standings page was an empty placeholder. S4 impact: the Standings page shows real division standings with win-loss records.

**Prefer after:** S13 + **S21** (typed fetch and standings stored as BT projection). **Also prefer after S24** and **S25** (standings gets a `web/src/api/standings.ts` resource, not a page-level fetch).

**Scope files:** `fixtures/`, `packages/domain/`, `packages/ports/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S4.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S4.sh` performs)

1. `fixtures/standings-2026-09-05.json` exists and is valid JSON. **(Amended 2026-09-09, backlog review.)** S13 committed a real `statsapi.mlb.com` recording under its honest date rather than relabelling 2026 data as 2024; `fixtures/standings-2024-07-04.json` does not exist and must not be fabricated.
2. That fixture contains ≥2 divisions. Each division has a name/id and a teams list. Each listed team has a name string (`name` or `teamName`) and numeric `wins` and `losses`.
3. An in-process `GET /api/v1/standings?date=2026-09-05` (story-scoped functions test) returns 200. The JSON has ≥2 divisions and team records matching check 2. The route is registered in the S26 route table with its response type.
4. A web RTL/Vitest file exists that renders `StandingsPage` and asserts at least one team **name** from that fixture appears on the page.
5. That web test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
6. `StandingsPage` (and any standings child components under `web/src/`) contain **no** `<img` team marks and **no** `mlbstatic` / `/logos/` image refs (name/abbr/color only — [VISUAL-DESIGN](./VISUAL-DESIGN.md)).
7. Those standings UI files do **not** call `useMediaQuery` or use `hiddenFrom` / `visibleFrom` to choose layout (`AppShellLayout.tsx` exempt).
8. This file’s S4 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Dropped the “or season snapshot” filename waffle; the committed file must be `fixtures/standings-2026-09-05.json` (amended 2026-09-09 to the file S13 actually recorded).
- Note for AC2: in that recording `divisions[].name` is `null` while `divisions[].id` is populated, so the “name/id” check must accept the id.
- Required `wins` and `losses` on each team record (original said “team records” without fields).
- Added VISUAL-DESIGN constraints: no logos; no viewport-query layout brain.

**Goal condition:** scripts/verify-S4.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, packages/ports/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S4. Work item 0 first: if scripts/verify-S4.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S4.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, packages/ports/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S4.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S5 — Search page queries highlights fixture

**Gap:** Search stub; FEATURES carries highlight search.

**Impact:** Before S5, the Search page was an empty placeholder. S5 impact: searching finds real highlight videos by title or description.

**Prefer after:** **S24** and **S25** (search results are a cache resource with the query string as part of the key).

**Scope files:** `fixtures/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S5.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S5.sh` performs)

1. An in-process `GET /api/v1/search/highlights?q=walk-off` returns 200 and a JSON array (or `{ highlights: [...] }`) with length ≥ 1. The route is registered in the S26 route table with its response type.
2. At least one returned highlight has `title` or `blurb` matching `/walk-off/i` (fixture `744834` title is `Lane Thomas hits a walk-off home run`).
3. `GET /api/v1/search/highlights` with empty or missing `q` returns **400** and a JSON error code exactly `query_required`.
4. A web RTL/Vitest file exists that drives the Search page with query `walk-off` and asserts a result title/blurb from check 2 is visible.
5. That web test file and the functions test covering checks 1–3 exit 0 when run as named story-scoped Vitest files.
6. `SearchPage` (and search result children under `web/src/`) render **typographic** results: **no** `<img` / thumbnail / photo poster in the results list ([VISUAL-DESIGN](./VISUAL-DESIGN.md) — no photographs as browsing chrome).
7. Those search UI files do **not** call `useMediaQuery` or use `hiddenFrom` / `visibleFrom` to choose layout (`AppShellLayout.tsx` exempt).
8. This file’s S5 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S5.sh exits 0, pnpm verify exits 0, no files outside fixtures/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S5. Work item 0 first: if scripts/verify-S5.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S5.sh exits 0, pnpm verify exits 0, no files outside fixtures/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S5.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S6 — Settings page persists favorites in localStorage (free tier)

**Gap:** Settings stub; cloud sync is patron-gated later.

**Impact:** Before S6, the Settings page was an empty placeholder and there was no way to mark a favorite team. S6 impact: favorites are saved on the device and still there after a reload, no account required.

**Prefer after:** **S24** optional (theme already cascading). Independent of **S25**: settings are a *separate* state kind — one persisted store read directly by views, not a cache resource ([ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) rule 6).

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S6.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S6.sh` performs)

1. A web RTL/jsdom test exists that: renders `SettingsPage`; toggles a favorite for a numeric team id; remounts the page (or simulates reload); and asserts that team id is still selected/persisted via `localStorage`.
2. That test does not call `fetch` or `XMLHttpRequest` (no network). The script greps the Settings page module and its test for `fetch(` / `XMLHttpRequest` and fails if either is used to persist favorites.
3. That test file exits 0 when run via `pnpm --filter @bt/web exec vitest run` on that file alone.
4. Favorites persist as settings the rest of the app can read later (e.g. `localStorage` key). **Do not** introduce a separate “presentation profile” object between settings and views ([VISUAL-DESIGN](./VISUAL-DESIGN.md) §5a). The script greps `web/src/` for `presentationProfile` / `PresentationProfile` and fails if either appears.
5. This file’s S6 **Status** (story heading and top table) is `done`.

**Out of scope**

- Light/Dark/System toggle (S24 sets `auto`; a Settings control can be a later story).
- Hide-scores / no-spoilers (free-text titles are a product problem — later theme).
- Cloud sync (patron).

**Tightened (flagged)**

- Required remount/reload via `localStorage` (original said “reload keeps it”).
- Made “no network calls required” a grep + test invariant, not a comment.
- Explicitly forbid a presentation-profile middle layer.

**Goal condition:** scripts/verify-S6.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S6. Work item 0 first: if scripts/verify-S6.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S6.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S6.sh, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S7 — Firestore adapter behind ports (emulator-ready)

**Gap:** ADR-012 / ADR-013 — memory repos only. No Firestore SDK is a dependency anywhere today
(`grep -r "firebase-admin\|@google-cloud/firestore"` is empty), so AC1/AC2 cannot be met without
adding one — hence `functions/package.json` + `pnpm-lock.yaml` are in the fence (rule 14).

**Impact:** Before S7, all of the app's data lived only in the server's memory and vanished on every restart — fine for local development, not for running for real. S7 impact: the same data can now be stored in Firestore instead, with no other code needing to change; local development still needs no cloud account.

**Scope files:** `functions/src/`, `functions/package.json`, `functions/vitest.config.ts`, `packages/ports/`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`

**Out of scope:** promoting `functions/src/services/projection-store.ts` (S21) and
`functions/src/services/replay-store.ts` (S22) to ports with Firestore adapters — S7 covers only the
`ScheduleRepository` / `GameRepository` snapshot repos in `packages/ports/src/repositories.ts`. The
store-to-port promotion is a Later theme.

**Work**

0. Write `scripts/verify-S7.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S7.sh` performs)

1. `FirestoreScheduleRepository` and `FirestoreGameRepository` exist under `functions/src/adapters/` and are TypeScript-assignable to `ScheduleRepository` and `GameRepository` (a story-scoped type-level or compile-checked test proves this).
2. A functions integration test file exists that:
   - **skips** (Vitest `skip` / `skipIf`) the emulator round-trip when `FIRESTORE_EMULATOR_HOST` is unset, and that file still exits 0 in that case;
   - contains an upsert-then-get round-trip assertion that runs when `FIRESTORE_EMULATOR_HOST` is set.
3. `functions/src/local-server.ts` still constructs `InMemoryScheduleRepository` / `InMemoryGameRepository` (or equivalent memory adapters) as the default — not Firestore — unless an explicit documented env flag is set.
4. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (existing API tests still pass offline).
5. `pnpm verify` still passes. The emulator round-trip is skipped in CI, so the Firestore adapter method bodies run there only if written thin; keep the `functions` coverage floor green by writing the adapters thin **or** by adding the Firestore adapter files to the `coverage.exclude` list in `functions/vitest.config.ts` (in scope) the way `src/local-server.ts` already is. Do not lower a threshold number.
6. This file’s S7 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- When `FIRESTORE_EMULATOR_HOST` is set, the round-trip actually passing against a running emulator. The script must not start the emulator, must not require it, and must not claim that path passed. It only checks that the skip/run split exists and the skip path exits 0.

**Goal condition:** scripts/verify-S7.sh exits 0, pnpm verify exits 0, no files outside functions/src/, functions/package.json, functions/vitest.config.ts, packages/ports/, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — bounded by the ACs: add one Firestore SDK dep (`functions/package.json` + `pnpm-lock.yaml`), two adapters, one skip-guarded integration test, one assignability test, memory stays default, coverage floor held. Security rules and emulator startup/config are **out of scope** here (later story); if you find yourself writing rules, stop. Promoting the projection/replay stores to ports is out of scope (see the Out-of-scope note above).

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S7. Work item 0 first: if scripts/verify-S7.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S7.sh exits 0, pnpm verify exits 0, no files outside functions/src/, functions/package.json, functions/vitest.config.ts, packages/ports/, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S7.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S8 — Auth ports: magic-link + passkey verifier stubs for local

**Gap:** ADR-004 not implemented.

**Impact:** Before S8, there was no way for the app to prove who's making a request — every call was anonymous. S8 impact: the plumbing for signing in (magic-link email, passkeys) exists and is testable locally, ahead of wiring it into the real sign-in screen.

**Scope files:** `packages/ports/`, `functions/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

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

**Goal condition:** scripts/verify-S8.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S8. Work item 0 first: if scripts/verify-S8.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S8.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S8.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S9 — Align `pnpm dev` with emulator story (document + smoke)

**Gap:** ADR-013 targets Emulator Suite; today is local Node API + Vite.

**Impact:** Before S9, the local dev setup didn't clearly match what the docs described, and there was no quick way to prove the whole thing still starts up correctly. S9 impact: the docs are accurate, and one command proves the local server actually comes up and answers requests.

**Scope files:** `README.md`, `package.json`, `functions/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

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

**Goal condition:** scripts/verify-S9.sh exits 0, pnpm verify exits 0, no files outside README.md, package.json, functions/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S9. Work item 0 first: if scripts/verify-S9.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S9.sh exits 0, pnpm verify exits 0, no files outside README.md, package.json, functions/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S9.sh, or stop after 8 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S10 — Recap tab shows editorial blurb from fixture

**Gap:** Recap stub; FEATURES carries editorial recap.

**Impact:** Before S10, the Recap tab on a game page was an empty placeholder. S10 impact: opening a game's Recap tab shows a real editorial write-up of that game.

**Prefer after:** **S21** shapes if recap is projected; **S24** for theme.

**Scope files:** `fixtures/`, `packages/domain/`, `functions/src/`, `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

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

**Goal condition:** scripts/verify-S10.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S10. Work item 0 first: if scripts/verify-S10.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S10.sh exits 0, pnpm verify exits 0, no files outside fixtures/, packages/domain/, functions/src/, web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S10.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

## Data platform — MLB access & types

v2’s `baseball-theater-engine` (contracts + `MlbDataServer`) is **not** copied as a package — **do not reuse v2 source types**. Rebuild the *capability* behind ports: typed upstream payloads → mappers → BT domain → fixture + live adapters (ADR-001 / ADR-012). Do **not** reintroduce browser→proxy→MLB.

**Type design (required for S11+):**

- **Every nested object gets its own named type** — no inline `{ … }` object literals as field types in the exported `interface` / `type` definitions. (The zod parsers may nest `z.object(...)` inline as much as is convenient — runtime validation shape is not the constraint; the exported *types* are.) Inlining a type is allowed only where **specifically defensible** (a genuine one-off 1–2 field wrapper) and marked with a `// design-exception:` note.
- Names must reflect **purpose** (`PitchCoordinates`, `LiveGamePlayEvent`, `ScheduleGameTeam`, …), be **intelligently separable** into modules by concern (live feed, schedule, content, standings, players), and stay **usable** — no sprawling 60-character names, no 900 near-identical types. When shapes overlap, **compose**: `extends`, unions / discriminated unions, `Pick` / `Omit`, a shared base, or a small generic — whichever fits, not copy-paste variants.
- Upstream MLB types stay separate from BT product domain (`GameSnapshot`, etc.).
- Recorded payloads are modeled to near-total field coverage behind a mechanical gate (**S23**); unknown / newly seen fields stay discoverable (**S15**), never silently dropped without a report.

### S11 — MLB upstream payload types for carried loop

**Gap:** Domain has product snapshots (`GameSnapshot`, `AtBat`) but no typed Stats API live-feed / schedule / content shapes to parse against. Hand-authored fixtures skip that layer.

**Impact:** Before S11, the app only understood the small, hand-shaped practice games used for local testing — it had no real definition of what MLB's actual data looks like. S11 impact: the app now has real, typed definitions for MLB's schedule, live-game, and highlight data — the foundation every later data feature is built on.

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

**Impact:** Before S12, the app could only replay saved practice games — it had no way to actually talk to MLB's live service. S12 impact: the app can now fetch a real game from MLB and translate it into the app's own format.

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

### S23 — Full-fidelity upstream types for the recorded fixtures

**Gap:** S11 typed only the fields the carried loop binds to, and `packages/mlb-api` uses plain `z.object()` which **silently strips** everything else — so large branches of every payload are unmodeled: `liveData.boxscore` player stat lines (`stats.batting` / `pitching` / `fielding`, `seasonStats`, `battingOrder`, `info`, `note`, `teamStats`), `gameData.flags` / `review` / `gameInfo` / `weather` / `moundVisits` / `officialScorer` / `alerts`, schedule hydrate extras, content editorial detail. Target: model the recorded payloads to **near-total field coverage**, authored from scratch in the S11 style, held in place by a mechanical coverage gate — i.e. at least as complete as v2's `baseball-theater-engine` contracts without copying them.

**Impact:** Before S23, the app's understanding of MLB's data only covered the handful of fields early features needed — large parts of every game (full box scores, weather, official reviews, and more) were quietly being thrown away. S23 impact: the app now understands nearly everything MLB sends, and an automatic check will flag it if a future MLB payload has something new and unmodeled instead of silently dropping it.

**Depends on:** S11, S12. Picks up `fixtures/raw/live-823823-base.json` and `fixtures/raw/diffpatch-823823.json` too if S22 has landed them.

**No new recording:** every payload family in scope is already present in committed fixtures — `liveData.boxscore` (full), `gameData.*` branches, `leaders`, `decisions` in `fixtures/raw/live-823823.json`; hydrate extras in `fixtures/raw/schedule-2026-09-05.json`; editorial/highlight detail in `fixtures/raw/content-823823.json`. If a family v2 covered turns out to be absent from these, **stop and report** — that is a scoping fix, not a fence to widen.

**Scope files:** `packages/mlb-api/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S23.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S23.sh` performs)

1. `packages/mlb-api/src/` exports a coverage helper (e.g. `coverage.ts` with `leafPaths(value)` returning array-index-normalized leaf key-paths — every numeric index rendered as `[]` — and an `uncoveredPaths(raw, parsed)` set-difference).
2. A colocated `coverage.test.ts` parses **each** committed `fixtures/raw/*.json` with its matching `parse*` function and asserts `leafPaths(raw) \ leafPaths(parsed)` is a subset of an in-repo allowlist (`coverage-ignore.ts`), and that **every** allowlist entry carries a `// reason:` comment. The test fails on any raw path that is neither modeled nor explained. Runtime schemas **stay lenient** (unknown upstream keys must still not throw in prod — the S11 contract / `parse.ts` doc); this test is the strict layer.
3. The coverage test covers every `fixtures/raw/*.json` that is a **single raw upstream response** — at minimum `schedule-2026-09-05.json`, `live-823823.json`, `content-823823.json`, and `live-823823-base.json` (another live feed). `timestamps-823823.json` (a bare string array) needs only a `z.array(z.string())` parser or an explicit skip. `diffpatch-823823.json` is a derived replay envelope, **not** one upstream response — S22 types it; S23 does not.
4. The allowlist holds **≤ 25 entries total** across all fixtures — a hard ceiling so "explain everything" cannot decay into "ignore everything". The script counts entries and fails at 26+.
5. `liveData.boxscore` is fully modeled: named types for `LiveBoxscoreTeam.players[<id>]` (`person`, `position`, `status`, `stats.{batting,pitching,fielding}`, `seasonStats.{batting,pitching,fielding}`, `gameStatus`, `jerseyNumber`, `battingOrder`) and team-level `battingOrder`, `info` (label/value groups), `note`, `teamStats.{batting,pitching,fielding}`. The script greps for the type names and asserts `parse.ts` references them.
6. `gameData` models `flags`, `review`, `gameInfo`, `weather`, `moundVisits`, `probablePitchers`, `officialScorer`, `officialVenue`, `alerts` as named types (grep). `liveData` models `leaders` and `decisions` fully.
7. Grep of `packages/mlb-api/src/*.ts` (excluding `*.test.ts`): **no** `: any`, `as any`, `any[]`. `z.record(...)` / `z.unknown()` / `Record<string, ...>` are allowed **only** for genuine id-keyed maps (`gameData.players`, boxscore `players`) — the script permits ≤ 6 occurrences and fails above that.
8. **Composition, not repetition** — checked over the exported **types** in `packages/mlb-api/src/*.ts` (tests excluded; the zod schemas' internal nesting is not in scope):
   - no inline `{ … }` object-literal field types inside exported `interface` / `type` bodies (`Record<…>` and index signatures excepted) — each nested object is a named type. Up to **4** occurrences carrying a `// design-exception:` comment are allowed.
   - no exported type name exceeds **40 characters**.
   - a colocated `shape-dedup.test.ts` asserts no two exported interfaces share **≥ 80 %** of their field names unless one `extends` / `Pick`s / `Omit`s the other, or the pair is listed with a one-line reason. The intent: `extends` / unions / `Pick` / `Omit` / small generics over near-duplicate variants.
9. `pnpm --filter @bt/mlb-api exec vitest run` exits 0 — the coverage test, `shape-dedup.test.ts`, and the existing `parse.test.ts` all green.
10. This file's S23 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether the module split stays coherent as the type count roughly triples (junk-drawer risk — the script only enforces no-`any`, the coverage gate, and the composition checks).
- Naming **quality** — descriptive and idiomatic, not merely under 40 chars; whether an `extends` vs union vs discriminated-union vs generic choice is the natural one for a given shape.
- Whether a given inline shape is "specifically defensible" (a true one-off wrapper) or laziness dodging a name.
- Whether each coverage allowlist entry is genuinely not worth modeling vs. laziness. The ≤ 25 ceiling is the only mechanical guard.
- Endpoints v2's `MlbDataServer` had that are **not** in these fixtures — standings, people/players, teams, standalone boxscore/content — remain **S13**, which now inherits this coverage gate for the endpoints it adds.

**Tightened / bounded**

- "As complete as v2" is rewritten (rule 2) as a mechanical gate: every leaf path in every recorded fixture is either modeled or on a ≤ 25-entry reasoned allowlist.
- "Reasonable, usable types" is rewritten as AC 8: nested objects get their own named type (≤ 4 marked exceptions), names ≤ 40 chars, and a shape-dedup test that forces `extends` / union / `Pick` / `Omit` over near-duplicate interfaces.
- Runtime parse stays lenient (S11 rule 6); the coverage test is the strict layer — prod does not break on a new MLB field, but the field shows up as an unexplained path and fails CI until modeled or allowlisted.

**Goal condition:** scripts/verify-S23.sh exits 0, pnpm verify exits 0, no files outside packages/mlb-api/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 24 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 24 — assumes no new recording (the fixtures already carry every family in scope), one coverage helper + coverage test + shape-dedup test, and that the bulk of the work is authoring named, composed interfaces + matching zod schemas for boxscore depth and the `gameData` branches. If a scoped family is missing from the fixtures, or coverage of one payload alone eats the cap, stop and report — splitting into per-payload stories (live / schedule / content) is the fallback, not widening.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S23. Work item 0 first: if scripts/verify-S23.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S23.sh exits 0, pnpm verify exits 0, no files outside packages/mlb-api/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S23.sh, or stop after 24 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S13 — Expand MLB client: content, standings, players

**Gap:** v2 `MlbDataServer` also fetched content, standings, players; v3 port is schedule+game only. UI stories invent fixtures without a typed fetch path.

**Impact:** Before S13, the app could only fetch a game's schedule and box score from MLB — nothing else. S13 impact: the app can now also pull standings, article/video content, and player bios — the data every non-game-page feature (standings, search, player info) needs.

**Depends on:** S11, S12, S23 (reuse S23's coverage helper for the new endpoints)

**Scope files:** `packages/ports/`, `packages/mlb-api/`, `packages/domain/`, `functions/src/`, `fixtures/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S13.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S13.sh` performs)

1. `MlbStatsClient` (or a sibling port in `packages/ports/src/`) declares:
   - `fetchGameContent(gamePk)`
   - `fetchStandings(date)`
   - `fetchPlayers(ids)`
2. `FixtureMlbStatsClient` implements all three from committed JSON under `fixtures/`.
3. Named upstream types for those three endpoints live in the S11 tree, follow the same no-`any` + named-export rules as S11 checks 3–4, and are added to S23's `coverage.test.ts` (each new fixture parses with an unexplained-path set inside the ≤ 25-entry allowlist ceiling).
4. Unit tests exist for each mapper (content → highlight list, standings → the domain shape S4 uses, players → identity/season bag) using fixtures only; those test files exit 0 in isolation; they do not call the network.
5. This file’s S13 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Live HTTP for the new endpoints (same as S12 — no network in the script).
- **Resolved 2026-09-08:** the coverage gate needs *recorded* standings/people payloads, but the recorder is S14 and hand-authored fixtures would make the gate circular (author the JSON, then type exactly what you authored). Decision: record both once out of band, keeping the grader offline. `fixtures/raw/standings-2026-09-05.json` and `fixtures/raw/people-823823.json` are real `statsapi.mlb.com` responses.

**Turn cap amended 2026-09-08: 16 → 24** (cap hit mid-run; drift event logged in [Backlog reviews](#backlog-reviews)). The original 16 assumed three comparably sized endpoints. Measured against the recordings, cost is lopsided: of 235 leaf paths, ~208 land on types S11/S23 already built — people needed 2 new fields (`age`, `numTeams`), standings needed 24. Content was already largely built. A story splitting standings from content+people would size better than one 24-turn story.

**Goal condition:** scripts/verify-S13.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, packages/domain/, functions/src/, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 24 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S13. Work item 0 first: if scripts/verify-S13.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S13.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, packages/domain/, functions/src/, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S13.sh, or stop after 24 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S14 — Fixture recorder from live client

**Gap:** Fixtures are hand-curated; regenerating from MLB is tribal knowledge.

**Impact:** Before S14, refreshing the app's practice-game test data from real MLB games was undocumented and done by hand. S14 impact: one command re-records that data straight from MLB, so keeping it current is now repeatable instead of tribal knowledge.

**Depends on:** S12 (S13 for standings/content fixtures)

**Scope files:** `functions/`, `README.md`, `fixtures/`, `docs/v3/BACKLOG.md`

**Work**

0. Write `scripts/verify-S14.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S14.sh` performs)

1. `functions/package.json` defines a `record-fixtures` (or documented equivalent) command whose entrypoint lives under `functions/` — **not** `scripts/`, and **not** root `package.json` (root is outside this story's Scope files). The same file's dead `"seed": "tsx src/scripts/seed.ts"` script is removed or repointed — `functions/src/scripts/` does not exist at HEAD.
2. The recorder has **two recording paths**, because the `MlbStatsClient` port returns domain types only and never surfaces upstream JSON (`packages/ports/src/mlb.ts`; `HttpMlbStatsClient` parses and maps internally):
   - **raw** — writes verbatim upstream payloads, driven by an **injected `fetch`** (the existing `HttpMlbStatsClientOptions.fetchImpl` pattern), so a fake response records without network;
   - **normalized** — writes `fixtures/`-shaped JSON, driven by a **fake `MlbStatsClient`**.
   Neither path may call the network in the verify run. An `MlbStatsClient` adapter alone cannot satisfy the raw half — do not try.
3. The raw path writes the **established** `fixtures/raw/<endpoint>-<key>.json` names already consumed by `packages/mlb-api/src/coverage.test.ts` (`schedule-<date>`, `live-<gamePk>`, `content-<gamePk>`, `standings-<date>`, `people-<gamePk>`, `timestamps-<gamePk>`), so re-recording keeps the S23 coverage gate and the S22 prerequisite regenerable rather than orphaning them.
4. A Vitest file drives both paths for a date and a `gamePk` into a **temp dir** (`os.tmpdir()`, never committed `fixtures/`), then points `new FixtureMlbStatsClient(tmpDir)` at it and asserts the round-trip is **non-empty**, not merely non-throwing:
   - `fetchSchedule(date)` returns `games.length > 0` — `FixtureMlbStatsClient.fetchSchedule` swallows a read error and returns an empty day, so a bare "it loaded" assertion passes on a missing file;
   - `fetchStandings(date)` returns `divisions.length > 0` — same swallow;
   - `fetchGame(gamePk)` returns that `gamePk` **and `plays.length > 0`** — `fetchGame` overwrites embedded plays with the separate `plays-<gamePk>.json` file, so a recorder that inlines plays into `game-<gamePk>.json` round-trips silently to `plays: []`. The normalized path must emit `plays-<gamePk>.json` as its own file.
   That test file exits 0 in isolation and does not touch the network.
5. `README.md` documents the command, both paths, and states that CI / `pnpm verify` never requires network.
6. This file’s S14 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Running the recorder **with network** against live MLB and committing the resulting files. The script must not do that.

**Tightened (flagged)**

- Required the recorder entrypoint to live under `functions/` so `scripts/` stays frozen.
- Required the loadability check to use a fake client + temp dir (original allowed “running it with network”).
- **Amended 2026-09-09 (backlog review).** The old AC2 asked a fake `MlbStatsClient` to produce “raw + normalized” JSON. The port exposes no raw payload, so that criterion was unsatisfiable inside this story's fence and would have forced a rule-10 stop or a `packages/ports/` fence widening. Split into the two-path AC2 + AC4. Dropped AC1's “(or root `package.json`)” branch for the same reason — root is out of fence. Added the `fixtures/raw/` naming lock (AC3) and the non-empty / plays-split round-trip asserts (AC4).

**Turn cap:** 14 — assumes two recording paths (injected-`fetch` raw writer, fake-adapter normalized writer), the six recorded endpoints already named in AC3, the `plays-<gamePk>.json` split, one `functions/package.json` script, one Vitest file, and a README section. Raised from 10 at the 2026-09-09 review: 10 was set when AC2 was a single fake-client path; the two-path split is strictly more work.

**Goal condition:** scripts/verify-S14.sh exits 0, pnpm verify exits 0, no files outside functions/, README.md, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S14. Work item 0 first: if scripts/verify-S14.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S14.sh exits 0, pnpm verify exits 0, no files outside functions/, README.md, fixtures/, docs/v3/BACKLOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S14.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S15 — MLB API capability drift scanner

**Gap:** When Stats API adds fields/capabilities, nothing tells us. Development needs a repeatable “parse recent games → report unused/new paths” flow. S23 builds the path-coverage primitive against committed fixtures; S15 generalizes it into a runnable scanner (new / freshly recorded games, in-season) with a triage flow and docs — it does not re-invent the leaf-path diff.

**Impact:** Before S15, if MLB added something new to their data feed, nobody would know until it caused a confusing bug. S15 impact: running one command shows exactly what MLB sends that the app doesn't yet understand, so new capabilities get noticed and added on purpose instead of found by accident.

**Depends on:** S11, S23 (reuse the `leafPaths` / coverage helper); better with S12/S14 for live/raw samples

**Scope files:** `functions/`, `packages/`, `package.json` (root — AC1 needs the `mlb:scan-drift` script there), `README.md`, `CLAUDE.md`, `docs/v3/LOOP.md`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`

**Work**

0. Write `scripts/verify-S15.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S15.sh` performs)

1. Root `package.json` has `mlb:scan-drift` (or documented equivalent). The entrypoint lives under `functions/` or `packages/` — **not** `scripts/`.
2. Default invocation loads committed raw fixtures (no network unless `BT_USE_LIVE_MLB=1`, which the verify script must not set).
3. A Vitest file: given a fixture clone with an injected unused key path, the scanner **reports that path**; given only known paths, the “new paths” section is empty and the run exits 0. That test file exits 0 in isolation.
4. At least two of `docs/v3/LOOP.md`, `CLAUDE.md`, `README.md` mention the scanner command and that it is part of the **dev update flow** after new fixtures / in season.
5. Either the fixture-based scan is invoked from a named script that exits 0 on committed fixtures, or `package.json` `verify` documents that scan as optional — the script checks one of those two recordings exists. Default CI remains offline (`.github/workflows/ci.yml` does not set `BT_USE_LIVE_MLB`). `.github/` is **read-only** for this story: the script greps it, and a failure here is a rule-10 stop, not an edit.
6. `CLAUDE.md`'s monorepo table lists `packages/mlb-api` (it has been a workspace package since `c375ad5` / S11 and the table still shows only `domain` and `ports`). This story already edits `CLAUDE.md` for AC4.
7. `packages/mlb-api/src/replay.ts` (added by S22: RFC6902 patch fold + throwing zod parsers — runtime code, not erased types) is in the `coverage.include` list of `packages/mlb-api/vitest.config.ts`, and that file's comment ("Only `parse.ts` and `coverage.ts` carry runtime code; the other modules are upstream type declarations") is corrected. `pnpm --filter @bt/mlb-api exec vitest run --coverage` stays green — add reconstruction/parse tests next to `replay.test.ts` if the fold's `add`/`remove`/`replace`/`copy`/`move` branches fall under the package threshold. Do not lower a threshold number; if the gap is large, stop and report it as S22 test debt.
8. This file’s S15 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Whether a reported path should become a type/story (triage). The script only checks that the scanner reports injected unknowns.

**Turn cap:** 16 — assumes S23's `leafPaths` / `uncoveredPaths` helper is reused as-is (it is, at `packages/mlb-api/src/coverage.ts`), one scanner module, one root script entry, one Vitest file with an injected unknown path, two doc edits, and the AC7 `replay.ts` coverage-include fix (raised 14 → 16 for it at the 2026-09-09 S22 review — assumes `replay.test.ts` already covers most of the fold; if not, AC7 says stop and report as S22 debt). If the scanner starts re-deriving the leaf-path diff, stop: that primitive already exists.

**Goal condition:** scripts/verify-S15.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/, package.json, README.md, CLAUDE.md, docs/v3/LOOP.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S15. Work item 0 first: if scripts/verify-S15.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S15.sh exits 0, pnpm verify exits 0, no files outside functions/, packages/, package.json, README.md, CLAUDE.md, docs/v3/LOOP.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S15.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S22 — Post-game diffPatch capture + replay store

**Gap:** `games.upsert` keeps only the latest `GameSnapshot` (last-write-wins). MLB publishes a per-game timecode log (`/api/v1.1/game/{pk}/feed/live/timestamps`) and the delta between any two timecodes (`/api/v1.1/game/{pk}/feed/live/diffPatch?startTimecode=&endTimecode=`). Once a game is final we can walk that log **once**, store the ordered patch sequence plus the base feed, and reconstruct any point in the game later (variable-speed replay, rebuilding temporal state) with **no** live pipeline and **no** per-viewer MLB egress (ADR-002).

**Impact:** Before S22, once a game ended the app only kept its final snapshot — there was no way to look back at how the game unfolded moment by moment. S22 impact: a finished game's entire play-by-play can be captured once and replayed later at any point or speed, without ever contacting MLB for it again.

**Depends on:** S11 (feed payload types for the base snapshot), S12 (`HttpMlbStatsClient` + `mapLiveFeed` to reuse). Sibling to S13 — both extend the MLB client. Does **not** depend on S21: the replay store holds raw upstream patches, not BT projections.

**Prerequisite (satisfied 2026-09-07):** `fixtures/raw/` holds the recorded timecode walk for **CHC @ MIA, gamePk 823823, 2026-09-05**, captured out-of-band from `statsapi.mlb.com` (the Verify-script contract forbids network and the recorder is S14). Committed byte-exact where raw, derived where noted; `fixtures/raw` is in `.prettierignore`. Re-record with the same upstream URLs if stale:

| File | Contents |
|------|----------|
| `fixtures/raw/timestamps-823823.json` | verbatim `/api/v1.1/game/823823/feed/live/timestamps` — 554 timecodes |
| `fixtures/raw/live-823823-base.json` | verbatim `/api/v1.1/game/823823/feed/live?timecode=<first timecode>` — the base the chain roots at (`Preview` state, ~2h before first pitch) |
| `fixtures/raw/diffpatch-823823.json` | 553-entry array, one per adjacent timecode pair: `{ startTimecode, endTimecode, diff }` where `diff` is the RFC6902 op list from `/feed/live/diffPatch` (many are `[]`). ~15 near-duplicate 2s-apart pairs that MLB returns a full feed for instead of a patch are stored as a computed minimal add/remove/replace diff with `"rebased": true` |

**Scope files:** `packages/ports/`, `packages/mlb-api/`, `functions/`, `fixtures/raw/`, `README.md`, `scripts/verify-S23.sh`, `pnpm-lock.yaml`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`

> **Fence widened 2026-09-09 (user-approved, drift event for the next review).** Two additions the story author missed:
> - `scripts/verify-S23.sh` — AC9 registers `diffpatch-823823.json` in `coverage.test.ts`; the S23 grader had a guard that *failed* on exactly that, and a `z.unknown()`/`Record<string,` ceiling (6) that did not anticipate `replay.ts`. In scope **only** to delete that guard and raise the ceiling 6 → 8 with a comment.
> - `pnpm-lock.yaml` — AC1's port method returns `@bt/mlb-api`'s `GameDiffPatchResponse`, so `packages/ports/package.json` gains a `workspace:*` dep and the lockfile records the link. Listed in S25's and S29's scope; omitted here.

**Work**

0. Write `scripts/verify-S22.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S22.sh` performs)

1. `MlbStatsClient` (or a sibling port in `packages/ports/src/`) declares `fetchGameTimestamps(gamePk)` returning a string list and `fetchGameDiffPatch(gamePk, startTimecode, endTimecode)` returning a typed patch. `FixtureMlbStatsClient` implements both from the committed `fixtures/raw/` payloads.
2. Named types in the `packages/mlb-api/` tree (one name contains `DiffPatch`): the raw MLB diffPatch response (`[{ diff: JsonPatchOp[] }]`, `JsonPatchOp` = `op` / `path` / `value?` / `from?`) and a `ReplayPatchEntry` envelope (`startTimecode` / `endTimecode` / `diff` / `rebased?`). Both pass the S11 no-`any` + named-export rules (checks 3–4 there). A zod-or-valibot (or throwing) parse helper exists and is exercised by a test.
3. A **pure** module (no `fetch` / `fs` / `https` in the file) exports a builder that, given the base feed JSON + the ordered `ReplayPatchEntry[]`, returns the reconstructed feed state at each timecode (RFC6902 apply-patch fold — must handle `add` / `remove` / `replace` / `copy` / `move`). Empty-diff entries are collapsed; the retained timecodes are exposed.
4. A Vitest file: `fixtures/raw/live-823823-base.json` + `fixtures/raw/diffpatch-823823.json` → reconstructed states; asserts (a) the retained (non-empty-diff) entry count is ≥ 1 and **fewer** than the 553 total entries, (b) the **final** reconstructed state through `mapLiveFeed` yields a `GameSnapshot` with `gamePk` 823823 and the game's final away/home runs (cross-checked against `fixtures/raw/live-823823.json`), (c) `liveData.plays.allPlays` length is non-decreasing across the sequence. Exits 0 in isolation.
5. A capture entrypoint under `functions/` (**not** `scripts/`) — a `functions/package.json` script such as `capture-replay` — takes a `gamePk`, calls `fetchGameTimestamps` + walks adjacent `fetchGameDiffPatch` pairs, and persists **one** replay artifact (base ref + ordered retained patches + timecodes) through a repository (memory adapter is enough). A test runs it against `FixtureMlbStatsClient` + the memory repo and asserts the stored artifact round-trips to the same reconstructed final state as check 4. No network; no writes into committed `fixtures/` during the verify run (temp dir only).
6. `functions/src/local-server.ts` default wiring is unchanged (still `FixtureMlbStatsClient`; capture is an explicit command, not part of `pnpm dev`).
7. `README.md` documents the `capture-replay` command, that it runs **after** a game is final (with a grace note for post-game stat revisions), and that `pnpm verify` / CI never invoke it with network.
8. `web/` is not modified (script greps the diff for `web/` paths and fails if any appear).
9. `fixtures/raw/diffpatch-823823.json` is registered in `packages/mlb-api/src/coverage.test.ts` with its parser, so the replay envelope is field-gated like every other recorded fixture. That file's comment explicitly defers this to “the replay story” and nothing else in the backlog carries it; the allowlist stays inside S23's ≤ 25-entry ceiling.
10. This file's S22 **Status** (story heading and top table) is `done`.

**Needs human judgment**

- Running `capture-replay` with network against a real finished game and committing / storing the artifact. The script proves only the offline fixture path.
- Whether the retained-timecode filter keeps meaningful granularity (it only checks "fewer than raw pairs, at least one").
- Prod archival target for the artifact (Cloud Storage / CDN vs a Firestore subcollection) — later wiring; memory adapter here.

**Tightened / bounded**

- Fixed the capture to the **post-game batch** walk (timestamps → adjacent diffPatch), not a live in-window stream. Live capture, if ever wanted, is a separate story off S16.
- Fixed reconstruction to operate on **raw upstream feed JSON**, mapped to domain only via the existing `mapLiveFeed`, so a future normalizer change cannot invalidate stored patches.
- Required the diffPatch type in the S11 tree (not a loose inline type) plus a parse helper, matching S11 / S13.

**Goal condition:** scripts/verify-S22.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, functions/, fixtures/raw/, README.md, scripts/verify-S23.sh, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ (except verify-S22.sh and the user-approved verify-S23.sh guard fix) or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 16 — assumes the three recorded raw fixtures already exist (Prerequisite), two new port methods with fixture impls, one diffPatch type + parser, one pure apply-patch builder, one capture command with a memory repo. Confirmed at the 2026-09-09 review and left at 16: S23 already landed `parseGameTimestamps` and the `timestamps-823823.json` coverage row, so half of the timestamps side of AC1/AC2 is done, which offsets the new AC9. Put the AC4/AC5 tests under `functions/` — they need `mapLiveFeed`, and `packages/mlb-api` must not depend on `functions`. If the recorded fixtures are missing, stop at Work item 0 and report the Prerequisite — do not synthesize them.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S22. Work item 0 first: if scripts/verify-S22.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S22.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, packages/mlb-api/, functions/, fixtures/raw/, README.md, scripts/verify-S23.sh, pnpm-lock.yaml, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S22.sh and the user-approved verify-S23.sh guard fix, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

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

**Impact:** Before S21, the app mostly stored raw, unprocessed MLB data with nothing organizing it into the app's own shapes. S21 impact: incoming MLB data is turned into organized, purpose-built records (game header, linescore, plays, box score, media) that later screens and live features can read directly, instead of every feature having to pick apart MLB's raw format itself.

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

**Status:** `done`

---

### S16 — ADR-002 active-window ingest cadence loop

**Gap:** No worker ticks in-window games; store only fills on request/fixture seed.

**Impact:** Before S16, the app's data only updated when someone happened to load a page — nothing kept a live game current in the background. S16 impact: games actually in progress now refresh automatically on their own, so the data is fresh even before anyone opens the page — and the app stops checking once a game's window has passed, so it isn't wasting effort on games nobody's watching.

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

**Status:** `done`

---

### S17 — Out-of-window refresh-on-read + single-flight

**Gap:** ADR-002 cache mode may refresh on read; stampede must not recreate shared-egress overload. `functions/src/services/ingest.ts` already exposes `getOrRefreshGame` / `getOrRefreshSchedule` with a `force` flag and a **missing-entry** refetch, and out-of-window reads are already stored `windowMode: "cache"`. S17 adds the parts that do not exist: the **staleness** trigger (documented TTL vs `fetchedAt` when `windowMode` is `cache`), single-flight dedup, and a refresh cooldown — on top of that path, not a new read path.

**Impact:** Before S17, an old, finished game's data could go stale forever once cached, or risk hammering MLB's servers if refreshing were added naively. S17 impact: a stale old game refreshes itself once when someone looks at it again, then cools down — data stays reasonably current without ever overloading MLB.

**Depends on:** S12; S16 optional

**Scope files:** `functions/src/`, `packages/domain/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`

**Work**

0. Write `scripts/verify-S17.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S17.sh` performs)

1. Game and/or schedule read path: when `windowMode` is `"cache"` and data is missing or stale per a documented TTL exported from one module (named constant such as `CACHE_TTL_MS`), the path triggers **one** upstream refresh.
2. A unit test: N parallel reads for the same refresh key result in **exactly 1** upstream call (single in-flight promise). That file exits 0 in isolation.
3. Cooldown / rate-limit is a named documented constant. A test asserts a second refresh inside the cooldown does **not** re-hit upstream. That file exits 0 in isolation.
4. `pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts` exits 0 (default fixture/local path stays offline-safe).
5. This file’s S17 **Status** (story heading and top table) is `done`.

**Turn cap:** 14 — assumes S17 extends the existing `getOrRefreshGame` / `getOrRefreshSchedule` read path in `functions/src/services/ingest.ts` rather than building one: one exported TTL constant (`CACHE_TTL_MS` or similar), one in-flight-promise map for single-flight, one cooldown constant, two new story-scoped Vitest files (single-flight, cooldown) plus the `api.test.ts` regression, and the TTL/cooldown constants documented in the module that exports them. Cheaper than at authoring time — the read-path plumbing and `windowMode: "cache"` persistence already exist — so 14 is a ceiling, not an estimate. If single-flight or the TTL check forces a change outside `functions/src/` + `packages/domain/`, stop and report (rule 10).

**Goal condition:** scripts/verify-S17.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/domain/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S17. Work item 0 first: if scripts/verify-S17.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S17.sh exits 0, pnpm verify exits 0, no files outside functions/src/, packages/domain/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S17.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `done`

---

### S18 — BT-mediated live delivery (SSE/WebSocket port)

**Gap:** Clients cannot subscribe to “the game I’m watching” updating when BT state changes.

**Impact:** Before S18, there was no way for the app to tell a browser "this game you're watching just changed" — a viewer had to refresh manually to see anything new. S18 impact: the backend can push a live update to a connected browser the moment a watched game changes — the plumbing a real live-updating game page needs.

**Architecture constraints:** Delivery is **BT-mediated** (local Node / Cloud Functions URL or Hosting rewrite). Do **not** make the SPA listen directly to Firestore hot game docs as the primary path. Do **not** open MLB from the browser. Prefer a **port** (`GameLiveHub` / similar) so transport can be SSE or WebSocket behind an adapter.

**Depends on:** S16 (something to publish) or test double that publishes on upsert

**Scope files:** `packages/ports/`, `functions/src/`, `README.md`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S18.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S18.sh` performs)

1. A port named `GameLiveHub` (or documented equivalent in `packages/ports/src/`) exposes subscribe/unsubscribe by `gamePk` and publish of a snapshot (or versioned payload). An in-memory adapter exists for tests.
2. Local HTTP server exposes **one** of SSE or WebSocket (script greps README or handler for which) at e.g. `GET /api/games/:gamePk/live` and pushes when that game is upserted.
3. An integration test: open a subscription → upsert the game via repo/hub → client receives a payload containing a new `fetchedAt` or linescore field. No MLB network. That file exits 0 in isolation (ephemeral localhost server allowed).
4. `README.md` states that prod may keep short-poll as fallback and that push is the live UX path for a watched game.
5. `web/` does not import Firestore listeners on `games/` docs as the primary live path (script greps `web/` for `onSnapshot` / `games/` listener usage and fails if present).
6. This file’s S18 **Status** (story heading and top table) is `done`.

**Goal condition:** scripts/verify-S18.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S18. Work item 0 first: if scripts/verify-S18.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S18.sh exits 0, pnpm verify exits 0, no files outside packages/ports/, functions/src/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S18.sh, or stop after 16 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S19 — Web client auto-updates watched game

**Gap:** Game page is one-shot fetch; Live/Plays/etc. do not move when BT updates.

**Impact:** Before S19, opening a game page fetched it once and then never changed, even if the score moved. S19 impact: a game page you're watching updates itself live — score, inning, and plays move in real time, without you refreshing or losing your place.

**Depends on:** S18, **S25** — the stream writes the cached game through that resource's named cache writer ([ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted) rules 4 and 10), so AC 2's "without navigation" is a patch, not a refetch.

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S19.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S19.sh` performs)

1. Opening a game route subscribes to that `gamePk` via the BT live endpoint (`EventSource` or `WebSocket` — script greps `web/src/` for one of those and the live path).
2. A component or integration test with a mocked live stream delivers **two** payloads and asserts the Live tab (and header score/linescore at minimum) show the **second** score/inning without navigation. That file exits 0 in isolation.
3. Unmount / leaving the route unsubscribes: the same test (or a sibling) asserts `close()` / `abort` is called on unmount.
4. This file’s S19 **Status** (story heading and top table) is `done`.

**Tightened (flagged)**

- Required an unmount test that asserts `close()`/`abort` (original allowed “test or lint-proof pattern”).

**Goal condition:** scripts/verify-S19.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S19. Work item 0 first: if scripts/verify-S19.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S19.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S19.sh, or stop after 12 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S20 — Scoreboard live refresh for in-window games

**Gap:** Scoreboard is static after first load.

**Impact:** Before S20, the scoreboard only showed scores as of the moment the page loaded — a game in progress looked frozen until a manual refresh. S20 impact: the scoreboard keeps in-progress games current on its own, and pauses refreshing when the tab isn't visible so it isn't wasted effort.

**Depends on:** S16 or S18 (poll BT schedule **or** subscribe to day channel—prefer poll of `/api/schedule` on an interval while page visible if day hub not built yet), plus **S25** — the interval and visibility behavior belong to the schedule resource's freshness policy, not to the page

**Scope files:** `web/src/`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

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

**Goal condition:** scripts/verify-S20.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S20. Work item 0 first: if scripts/verify-S20.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S20.sh exits 0, pnpm verify exits 0, no files outside web/src/, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S20.sh, or stop after 10 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### S28 — Version sunset path: deprecation headers + stale-client upgrade

**Gap:** [ADR-015](./ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted) makes additive-only the thing that protects a stale client *while a version lives*. Nothing covers the moment a version is **retired**: no `Deprecation` / `Sunset` signaling, no per-version usage logging to make retirement evidence-based, and no client path for "the version you were built against is gone." [FEATURES](./FEATURES.md) carries *Update / changelist UX* as the product surface for exactly this.

**Impact:** Before S28, there was no plan for what happens to someone still running an old version of the app once that version is retired — it would just start failing with no explanation. S28 impact: an outdated app tells the person using it that an update is available, instead of silently breaking, and what's already on their screen stays readable while they update.

**Why here:** Last of the versioning work, and the only part that is not needed until there is a real deployed client to be stale. It must land **before the first public deploy** (Later theme: Firebase Hosting/Functions deploy) — until then nothing can be skewed.

**Depends on:** S26 (versioned routes), S25 (one ingress helper to put the check in)

**Scope files:** `packages/domain/`, `functions/src/`, `web/src/`, `README.md`, `docs/v3/BACKLOG.md`, `docs/v3/AUDIT.md`, `CHANGELOG.md`

**Work**

0. Write `scripts/verify-S28.sh` meeting the [Verify-script contract](#verify-script-contract). Run it against current HEAD and show the nonzero exit **before** writing any product code (rule 9).

**Acceptance criteria** (checks `scripts/verify-S28.sh` performs)

1. Version lifecycle state lives in **one** exported place (e.g. `supported` / `deprecated` / `sunset` per version, with the sunset date), in `packages/domain/` alongside the S26 route table.
2. A functions test: a request to a version marked `deprecated` returns **200** plus `Deprecation` and `Sunset` response headers (RFC-style), and the body is unchanged. Exits 0 in isolation.
3. A functions test: a request to a version marked `sunset` returns **426** with a JSON error code exactly `version_unsupported`, and does **not** return payload data. Exits 0 in isolation.
4. Per-version observability: the handler records the requested version on each API request through a logger or counter seam that a test can assert (the test asserts two different versions produce two distinct records). No external telemetry service.
5. Client handling: the single S25/S26 ingress helper detects **426** and surfaces an app-level "reload to update" state. A web test asserts a mocked 426 produces that affordance and that it is **not** rendered on a normal 200. Exits 0 via `pnpm --filter @bt/web exec vitest run` on that file alone.
6. The 426 path does **not** clear or corrupt already-loaded cache data (a stale screen stays readable behind the prompt — [VISUAL-DESIGN D7](./VISUAL-DESIGN.md#1-design-goals) respect-attention). The web test asserts previously rendered content is still present.
7. `README.md` documents the lifecycle states, that retirement requires the usage log to show no traffic, and that `pnpm verify` never needs network for any of it.
8. This file's S28 **Status** (story heading and top table) is `done`.

**Out of scope**

- Choosing the actual sunset window length (ADR-015 "Still open" — needs a real deploy first).
- The full changelog/"what's new" content surface; this story ships the *upgrade prompt*, not release notes.
- Service-worker-driven update detection — PWA is dropped for MVP ([FEATURES](./FEATURES.md)).
- Creating a v2 to test against. Version lifecycle state is data; tests drive it with fixtures.

**Needs human judgment**

- Whether the reload prompt's wording and placement are right (the script only checks it appears on 426 and not on 200).
- Whether 426 is preferable to 410 for a retired version. ADR-015 picks 426 because the client action is "upgrade," not "this resource is gone."

**Goal condition:** scripts/verify-S28.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, web/src/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.

**Turn cap:** 14 — assumes lifecycle state as data, header + 426 behavior in the existing handler, one logging seam, and one client prompt wired into the single ingress helper. If it turns into a general notifications/release-notes feature, stop: that is the FEATURES *Update / changelist UX* theme, not this story.

**`/goal` command**

```text
/goal docs/v3/BACKLOG.md S28. Work item 0 first: if scripts/verify-S28.sh is missing, write it per the Verify-script contract, run it against current HEAD, and show the nonzero exit before writing any product code. Then: scripts/verify-S28.sh exits 0, pnpm verify exits 0, no files outside packages/domain/, functions/src/, web/src/, README.md, docs/v3/BACKLOG.md, docs/v3/AUDIT.md, CHANGELOG.md are modified, no files under scripts/ or test/ are modified except creating scripts/verify-S28.sh, or stop after 14 turns. If a criterion cannot be met inside that path list, stop and report which criterion and which path — do not widen the scope yourself.
```

**Status:** `todo`

---

### Later themes (not yet story-sliced)

Keep as themes until promoted; still architecture-aligned when sliced:

| Theme | Arch hook | Note |
|-------|-----------|------|
| Patreon OAuth link + entitlement refresh | ADR-004 | After S8 |
| Cloud-synced settings (patron) | FEATURES patronage | After S6 + S8 |
| Light/Dark/System control in Settings | VISUAL-DESIGN §3 | After S24 (`auto` default already) |
| AppShell variant chrome (drop viewport `navbar.breakpoint`) | VISUAL-DESIGN §5 | After S24; host assigns compact/expanded |
| Host pairing of views/variants (e.g. compact game pane beside expanded scoreboard) | VISUAL-DESIGN §5 | After carried loop; not an early must |
| Team colors on scoreboard/standings modules | VISUAL-DESIGN §3 | Data accent, never logos |
| No-spoilers for free-text titles (video/recap strings) | VISUAL-DESIGN §5a | Product rule — structured scores ≠ title copy; not a UI blank of numerals |
| Firebase Hosting/Functions deploy + Scheduler for S16 | ADR-005 / ADR-013 | Prod wiring of cadence |
| Promote `projection-store` / `replay-store` to ports + Firestore adapters | ADR-012 | After S7 — S7 only ports the schedule/game snapshot repos; the S21 projection store and S22 replay store stay memory-only concrete services until then (both self-flag "promote to a port when Firestore settles") |
| Replay artifact archival (Storage / CDN) + post-final trigger | ADR-002 read path | Prod target for S22; memory adapter until then |
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
| Full-fidelity upstream types (coverage gate) | **S23** (then S13 / S15 reuse the helper) |
| Post-game replay / diffPatch capture | **S22** |
| Ingest → durable BT projections | **S21**, then **S16–S17** |
| ADR-002 live delivery + watched UI | **S18–S20** |
| Brand theme + cascading color (VISUAL-DESIGN §3) | **S24** (before UI fill) |
| Typed BT API boundary (route → response, both ends) | **S26** (before S25) |
| API versioning + OpenAPI + breaking-change gate (ADR-015) | **S26** (`/api/v1` paths), **S27** (spec + oasdiff), **S28** (sunset / stale client) |
| Client state / typed read cache (ADR-014) | **S25** (before UI fill and S18–S20) |
| Scoreboard → game loop UI | S2–S3, S10, S19–S20 (**after** S21 shapes + prefer **S24**) |
| Standings | S4 (after S13 + S21; prefer S24) |
| Search | S5 (prefer S24; typographic results) |
| Settings | S6 (no presentation-profile layer) |
| BT-backed data / ports | S7, S9 |
| Auth G3 | S8 (+ later Patreon) |
| Plays / pitch viz | Done at baseline |
| VISUAL-DESIGN later (host pairing, team colors, no-spoilers titles, AppShell variant) | Later themes |
| AI / multi-source / FCM push | Later themes |

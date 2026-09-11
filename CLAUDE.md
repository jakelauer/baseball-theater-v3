# Baseball Theater v3 — agent conventions

Clean-slate rewrite of baseball.theater. Planning docs in `docs/v3/` are the product/architecture source of truth. This file captures **how the code is actually written today**.

## Stack (locked)

- **pnpm** workspaces · **Node ≥ 24** (`.nvmrc`)
- **TypeScript** strict, ESM (`.js` extensions in relative imports)
- **Vitest** (+ coverage thresholds per package)
- **React 19 + Vite + Mantine 7** SPA (`web/`)
- **Firebase** is the prod target; **local default is fixtures + in-memory repos** (no cloud required)
- Ports & adapters: domain/ports stay cloud-agnostic (ADR-012)

## Monorepo layout

| Path               | Role                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `packages/domain`  | Pure types + logic (no I/O). Coordinates, plays, entitlements, impact, window             |
| `packages/ports`   | Interfaces only (`MlbStatsClient`, repos, auth)                                           |
| `packages/mlb-api` | Upstream MLB Stats API types + zod parsers, leaf-path coverage diff, replay fold (no I/O) |
| `functions`        | Ingest services, HTTP handlers, fixture/memory adapters, local Node server                |
| `web`              | Mantine SPA; fetches `/api/*` via Vite proxy                                              |
| `fixtures/`        | Committed schedule/game/plays JSON for local + CI                                         |
| `docs/v3/`         | INTENT / FEATURES / VISUAL-DESIGN / ARCHITECTURE / BACKLOG / LOOP / AUDIT                 |

Do **not** put Firebase SDKs or Express into `packages/domain`. Put cloud impls under `functions/src/adapters/`.

## Code style

- **Formatting is ESLint's job for `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs`** (`eslint.config.js`, `@stylistic` rules) — tabs, Allman brace style (opening brace on its own line), double quotes, semicolons, trailing commas, 180-char lines. Prettier does not run on those extensions (`.prettierignore`) because it cannot express Allman brace placement; it still formats JSON/Markdown/YAML/CSS/HTML (`.prettierrc`). Run `pnpm lint --fix` rather than hand-formatting.
- `tsconfig.base.json` also carries `verbatimModuleSyntax` (type-only imports need `import type`), `noFallthroughCasesInSwitch`, `noImplicitOverride`, `allowUnusedLabels`, `experimentalDecorators`, `noErrorTruncation` — full `strict` + `noUncheckedIndexedAccess` + `moduleResolution: "Bundler"` stay as the safety/resolution baseline (not relaxed).
- Prefer small focused modules; match neighboring file patterns
- Named exports; avoid default exports except Vite/React entrypoints
- Domain functions are pure and unit-tested; keep thresholds high in `packages/domain`
- **MLB upstream types:** do **not** copy v2 `baseball-theater-engine` sources. Model the same _style_: named interfaces that reference each other, split by purpose (live / schedule / content / …). Avoid gigantic anonymous nested object types. Keep upstream types separate from BT product domain.
- Handlers stay thin: parse request → call service → `sendJson`
- Web: Mantine components, React Router routes in `web/src/routes.tsx`
- Do not add `useMemo`/`useCallback` by default (React Compiler-friendly)
- No drive-by refactors; no unsolicited markdown docs outside the task
- Prefer editing existing files over creating new abstractions

## Data & fixtures

- Schedule/game reads go through ports (`MlbStatsClient`, `ScheduleRepository`, `GameRepository`)
- Local/CI: `FixtureMlbStatsClient` reads `fixtures/schedule-*.json`, `fixtures/game-*.json`, `fixtures/plays-*.json`
- Play-level Statcast fields live on `GameSnapshot.plays` (`AtBat` / `PitchEvent` in domain)
- Pitch plate location uses `plateToStrikeZonePct`; trajectories use `samplePitchTrajectory` / kinematics — **not** v2’s hacky `%` formulas
- **Dev update flow:** after recording new fixtures (or periodically in season), run `pnpm mlb:scan-drift` — it diffs each raw payload against its parser and reports unmodeled paths to triage into typed fields or backlog stories. Offline by default; `BT_USE_LIVE_MLB=1 … --date= --game=` records a fresh game first
- **Live UX:** clients read BT only. Ingest cadence owns MLB pulls (ADR-002). Project upstream into durable BT store shapes before polishing UI. Watched-game updates go through a BT-mediated SSE/WebSocket (or short-poll) hub — not browser→MLB and not unbounded Firestore listeners on hot game docs as the default

## Testing

- Colocate `*.test.ts(x)` next to source
- Web tests: jsdom + `web/src/test/setup.ts` (mocks `matchMedia` for Mantine)
- Functions tests spin a real `http` server against memory repos + fixtures
- Coverage floors are enforced in each package’s `vitest.config.ts`
- **Truth gate:** `pnpm verify` (see `.claude/skills/verify/SKILL.md`)

## Quality automation

- Husky + lint-staged on commit (ESLint --fix + Prettier)
- CI (`.github/workflows/ci.yml`): lint → test:coverage → build
- `pnpm build` fails on lint

## Product boundaries (do not reintroduce)

Dropped from v2: featured/tagged video feeds, team pages, Chromecast, PWA (MVP), public playback catalog APIs, no-hitter bot, `/schedule` surface, Patreon-as-login.

Auth direction: Firebase Auth (magic link + passkeys); Patreon = linked payments/tier only.

## Agent / loop rules

- Work from `docs/v3/BACKLOG.md` stories; acceptance criteria must map to commands/tests
- Update backlog **Status** in the same change set: `doing` when you start, `done` when every AC passes (never leave it stale after finishing). Keep the top **Story status** table in sync and sorted by **Priority** (IDs are labels, not order).
- **Capture every finished story in the ledger.** Run `scripts/audit.sh story <ID>` before committing: it runs the grader and `pnpm verify` for real and appends what they checked to `docs/v3/AUDIT.md`, which ships in the same commit as the code. Never hand-write a ledger entry. A `done` story with no ledger entry is not done.
- **Reject starting the next story/goal** if the prior finished story is still uncommitted — commit first (or stop and ask the user). Uncommitted “done” work is incomplete for sequencing.
- **Re-evaluate the backlog when review debt is due — before starting the next story.** Due when **3** stories have flipped to `done` since the last review entry in `docs/v3/AUDIT.md`, **or** immediately on any drift event: a scope fence widened, a turn cap hit, ACs rewritten mid-run, a new ADR accepted, a new workspace package, a story inserted/re-prioritized outside a review, or `pnpm verify` itself changed. Procedure: `.claude/skills/backlog-review/SKILL.md`. Run it with **fresh context** (an agent that wrote the stories will rubber-stamp them). The review checks the next 3 stories for missing work and against HEAD, argues against the whole backlog's priority order, then records `continue` / `amended` / `blocked` in `docs/v3/AUDIT.md` via `scripts/audit.sh review`. **`blocked` means stop and ask.** A `continue` with no cited evidence does not count as a review.
- Never deploy to production Firebase, never force-push `main`, never commit secrets
- Ask before `git push`, PR creation, or changing CI/deploy workflows unless the user explicitly requested it
- Prefer fixture/local adapters over live MLB/Patreon unless the story says otherwise

## `/goal <ID> done` shorthand

Story IDs in `docs/v3/BACKLOG.md` are `S` + digits (`S1`…`S29`, case-insensitive here) — stable labels, not priority order. Each story's `### S<N> — …` section holds a **`/goal` command** block: a fenced ` ```text ` block with one line, `/goal docs/v3/BACKLOG.md S<N>. …`. The text on that line is the real completion condition; the story's **Acceptance criteria** list is what `scripts/verify-S<N>.sh` checks.

When the goal you are handed is just a story ID plus `done` (e.g. `/goal S27 done`):

1. Find `### S<N> — …` in `docs/v3/BACKLOG.md`. Begin your first response with `Goal for S<N>:` then, quoted **word for word**, that story's `/goal …` line followed by its full **Acceptance criteria** list (including nested bullets).
2. If there is no `### S<N> —` heading for the ID, or the story has no **`/goal` command** block, say so plainly and stop — do not guess what the story means.
3. Work toward the quoted text, not a paraphrase.
4. Never edit a story's `/goal` line or acceptance criteria in `docs/v3/BACKLOG.md` to make them easier to satisfy.
5. When you believe you are finished, end with a section headed `S<N> verified:` listing every clause of the quoted `/goal` line and every acceptance criterion, each with concrete evidence from this session (grader/test output, command exit codes, file contents). Do not mark a clause passed without showing the evidence.

This composes with the Agent / loop rules above — the grader, `scripts/audit.sh` ledger entry, and review-debt gate still apply.

## Commands

```bash
pnpm install
pnpm dev          # API :8787 + web :5173
pnpm verify       # lint + coverage tests + build (single exit code)
pnpm test         # vitest without coverage thresholds path used by CI
pnpm lint
```

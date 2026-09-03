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

| Path              | Role                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `packages/domain` | Pure types + logic (no I/O). Coordinates, plays, entitlements, impact, window |
| `packages/ports`  | Interfaces only (`MlbStatsClient`, repos, auth)                               |
| `functions`       | Ingest services, HTTP handlers, fixture/memory adapters, local Node server    |
| `web`             | Mantine SPA; fetches `/api/*` via Vite proxy                                  |
| `fixtures/`       | Committed schedule/game/plays JSON for local + CI                             |
| `docs/v3/`        | INTENT / FEATURES / ARCHITECTURE / BACKLOG / LOOP                             |

Do **not** put Firebase SDKs or Express into `packages/domain`. Put cloud impls under `functions/src/adapters/`.

## Code style

- Prefer small focused modules; match neighboring file patterns
- Named exports; avoid default exports except Vite/React entrypoints
- Domain functions are pure and unit-tested; keep thresholds high in `packages/domain`
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
- Never deploy to production Firebase, never force-push `main`, never commit secrets
- Ask before `git push`, PR creation, or changing CI/deploy workflows unless the user explicitly requested it
- Prefer fixture/local adapters over live MLB/Patreon unless the story says otherwise

## Commands

```bash
pnpm install
pnpm dev          # API :8787 + web :5173
pnpm verify       # lint + coverage tests + build (single exit code)
pnpm test         # vitest without coverage thresholds path used by CI
pnpm lint
```

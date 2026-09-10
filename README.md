# Baseball Theater v3

Clean-slate rewrite of [baseball.theater](https://baseball.theater). Planning docs live in [`docs/`](./docs/).

## Stack (locked)

- **React + Vite SPA** + **Mantine**
- **pnpm** workspaces · **Vitest** · ESLint · Prettier · Husky
- **Firebase** for prod (Functions / Firestore / Auth / Hosting)
- **Local-first:** fixture MLB data + in-memory repos — **no cloud project required**

## Quick start

```bash
nvm use          # Node 24 LTS (.nvmrc)
pnpm install
pnpm dev         # API :8787 + web :5173
```

Open http://localhost:5173 — scoreboard for `2024-07-04` loads from fixtures.

Useful routes:

- `/games/2024-07-04` — scoreboard
- `/game/744834` — game (impact-sorted videos)
- `/standings`, `/search`, `/settings` — stubs

## Scripts

| Command              | What                                             |
| -------------------- | ------------------------------------------------ |
| `pnpm verify`        | **Single health gate** (lint + coverage + build) |
| `pnpm dev`           | Local API + Vite                                 |
| `pnpm test`          | Vitest (all packages)                            |
| `pnpm test:coverage` | Coverage + thresholds                            |
| `pnpm lint`          | ESLint                                           |
| `pnpm build`         | lint → typecheck → build                         |

Loop / agent automation: [docs/v3/LOOP.md](./docs/v3/LOOP.md) · backlog [docs/v3/BACKLOG.md](./docs/v3/BACKLOG.md) · conventions `CLAUDE.md`.

## Packages

```
packages/domain   # pure types + logic (coordinates, impact, entitlements)
packages/ports    # repository / MLB / auth interfaces
functions         # ingest + HTTP API (local Node server; Firebase later)
web               # Mantine SPA
fixtures/         # schedule + game JSON for local/CI
```

## Recording fixtures

The committed corpus under `fixtures/` is regenerated from live MLB by one
command. It is the only network-touching entrypoint in the repo:

```bash
pnpm --filter @bt/functions record-fixtures -- \
  --date=2026-09-05 --game=823823 --players=592450,605141
```

It has two recording paths, because the `MlbStatsClient` port returns domain
types and never surfaces upstream JSON:

- **raw** — verbatim upstream payloads into `fixtures/raw/<endpoint>-<key>.json`
  (`schedule-<date>`, `live-<gamePk>`, `content-<gamePk>`, `timestamps-<gamePk>`,
  `standings-<date>`, `people-<gamePk>`). Bytes are written exactly as received,
  so the `packages/mlb-api` coverage gate keeps working; `fixtures/raw` is in
  `.prettierignore` — do not reformat these.
- **normalized** — `fixtures/`-shaped JSON read back by `FixtureMlbStatsClient`
  (`schedule-<date>`, `game-<gamePk>`, `plays-<gamePk>`, `standings-<date>`,
  `players-<gamePk>`). Plays are written as their own file: `fetchGame`
  overwrites inlined plays with `plays-<gamePk>.json`.

**CI and `pnpm verify` never require network.** Both stay on
`FixtureMlbStatsClient`; the live client is opt-in via `BT_USE_LIVE_MLB=1`.
Running the recorder against live MLB and committing the result is a deliberate
human step — review the diff first.

## Capturing a post-game replay

```bash
pnpm --filter @bt/functions capture-replay <gamePk>
```

Walks a **finished** game's timecode diff log once
(`/feed/live/timestamps` → adjacent `/feed/live/diffPatch` pairs), collapses the
idle steps, and stores one replay artifact (base timecode + ordered retained
patches). Any point in the game can then be reconstructed from that artifact plus
the base feed — no live pipeline, no per-viewer MLB egress (ADR-002).

Run it **after the game is final**, and leave a grace window for post-game stat
revisions before capturing. Like the recorder it is network-touching and
**never** run by `pnpm verify` or CI — those exercise only the offline fixture
path (`fixtures/raw/diffpatch-823823.json`).

## Docs

- [INTENT](./docs/v3/INTENT.md) · [FEATURES](./docs/v3/FEATURES.md) · [ARCHITECTURE](./docs/v3/ARCHITECTURE.md)

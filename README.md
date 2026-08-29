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

| Command              | What                     |
| -------------------- | ------------------------ |
| `pnpm dev`           | Local API + Vite         |
| `pnpm test`          | Vitest (all packages)    |
| `pnpm test:coverage` | Coverage + thresholds    |
| `pnpm lint`          | ESLint                   |
| `pnpm build`         | lint → typecheck → build |

## Packages

```
packages/domain   # pure types + logic (coordinates, impact, entitlements)
packages/ports    # repository / MLB / auth interfaces
functions         # ingest + HTTP API (local Node server; Firebase later)
web               # Mantine SPA
fixtures/         # schedule + game JSON for local/CI
```

## Docs

- [INTENT](./docs/v3/INTENT.md) · [FEATURES](./docs/v3/FEATURES.md) · [ARCHITECTURE](./docs/v3/ARCHITECTURE.md)

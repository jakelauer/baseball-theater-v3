---
name: verify
description: Prove the Baseball Theater v3 working tree is healthy with a single exit code. Use after any code change, before declaring a story done, and when a loop/goal asks whether the app works.
---

# Verify

## Single gate (required)

```bash
pnpm verify
```

This is the truth signal. Exit code **0** means:

1. ESLint passes for the whole repo
2. Vitest passes in all packages **with coverage thresholds**
3. Typecheck + package builds succeed (`pnpm build`, which also re-runs lint)

Exit code **non-zero** means the change is not done. Do not claim success.

### What this covers

| Check                    | How                                                           |
| ------------------------ | ------------------------------------------------------------- |
| Lint                     | `pnpm lint`                                                   |
| Unit / integration tests | `pnpm test:coverage` (domain, functions, web projects)        |
| Coverage floors          | Per-package Vitest thresholds                                 |
| Types + production build | `pnpm build`                                                  |
| HTTP schedule/game smoke | Covered by `functions/src/handlers/api.test.ts` (fixture API) |

### What this does **not** cover yet

- Visual pitch-animation correctness (manual / future Playwright)
- Firebase emulator Auth / Firestore adapters (not wired)
- Live MLB network calls (fixtures only by default)
- Deployed Hosting/Functions health

When a story needs a check beyond `pnpm verify`, add a **named test or script** and put that command in the story’s acceptance criteria. Do not rely on “looks right.”

## Faster local loops (optional)

While iterating inside one package:

```bash
pnpm --filter @bt/domain test
pnpm --filter @bt/functions test
pnpm --filter @bt/web test
pnpm lint
```

Still run **`pnpm verify`** before marking a goal/story complete.

When finishing a backlog story, also set its **Status** to `done` in `docs/v3/BACKLOG.md` (and commit that with the code). Verify alone is not enough if the backlog is stale.

Do **not** start another backlog story or `/goal` while the finished story’s changes are still uncommitted — commit first.

## Recipe maintenance

If you discover a new way a change can be “green” on verify but wrong in the product, add:

1. An automated test that fails for that case, **or**
2. A script invoked from `pnpm verify` / story AC

Then update this file with the new step.

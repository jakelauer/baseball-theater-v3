# Baseball Theater v3 docs

Working docs for the rewrite live here.

## v3 (in progress — clean slate)

v3 **does not inherit** the v2 implementation. See [v3/INTENT.md](./v3/INTENT.md).

| Doc | Role |
|-----|------|
| [v3/INTENT.md](./v3/INTENT.md) | Goals G1–G5 + clean-slate framing |
| [v3/FEATURES.md](./v3/FEATURES.md) | Product: keep / cut / add |
| [v3/ARCHITECTURE.md](./v3/ARCHITECTURE.md) | Greenfield design (**§1** data · **§2** Firebase · **§6** dev/CI · ADRs) |

## App (scaffolded)

Local-first monorepo: `pnpm install && pnpm dev` — see root [README](../README.md).


## v2 baselines (reference only)

Use these as a **capability menu** and list of lessons—not as a migration guide.

- [v2/FEATURES.md](./v2/FEATURES.md) — what the live app does today
- [v2/ARCHITECTURE.md](./v2/ARCHITECTURE.md) — how it’s built (incl. §1 proxy / shared egress)

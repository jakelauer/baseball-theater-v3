# Baseball Theater v3 — Origin

**Origin story.** Why v3 began, as set out in the planning docs from 2026-08-28 to 2026-09. Kept for provenance — it is not necessarily applicable now. Where this disagrees with [INTENT.md](./INTENT.md), INTENT wins. Edit only to correct the historical record.

**Relationship to v2:** Reference only. v3 is a **clean-slate product and architecture**. We do not inherit v2’s stack, deploy shape, proxy model, client state patterns, or “migrate the repo” constraints.

v2 docs under [`../v2/`](../v2/) exist so we can consciously decide what *capabilities* still matter—not so we can reuse how they were built.

---

## Goals (accepted)

These are the reasons v3 was started. Features and architecture written during planning trace back here (the `G1`–`G5` tags in [FEATURES](./FEATURES.md)).

| # | Goal | Means (high level) |
|---|------|--------------------|
| G1 | **Lower run cost** vs the Elastic Beanstalk-based v2 footprint | **Serverless** (and related modernizations); scale with use / game windows, not always-on app servers |
| G2 | **Value beyond MLB’s baseline** | Derive insight from **other data sources** and/or **our own analysis**, not only re-skinning Stats API payloads |
| G3 | **Better auth, same patronage money** | **Replace Patreon as the login/identity provider**; **keep Patreon as the payment / membership funding channel** |
| G4 | **AI as a product capability** | Integrate AI for **game analysis**, **statistical analysis**, **summarization**, and related experiences |
| G5 | **Richer overall product** | Grow the feature set into a **more robust** experience (not a thin parity port of v2) |

Supporting platform choice already aligned with G1/G2: **server-owned schedule & game data** with in-window cadence and out-of-window cache ([ARCHITECTURE ADR-002](./ARCHITECTURE.md#adr-002--data-access-topology-for-schedule--game-details-accepted))—enables coalesced upstream cost and a place to attach analysis/AI.

---

## What “serious rearchitecture” means here

| We are free to | We are not trying to |
|----------------|----------------------|
| Replace the entire technical system | Port CRA / Express / EB / Dynamo / Relay / MUI / engine package as-is |
| Use **Mantine** for UI | Keep Material UI v4 |
| Change how MLB (and other) data is obtained, cached, and authorized | Preserve `/api/proxy` or browser-orchestrated shared egress (**rejected** for schedule/game — see architecture §1) |
| Redefine identity while keeping Patreon payments | Keep Patreon OAuth as the session model |
| Drop half of v2 UX if it doesn’t earn a place | Feature-parity checklist as a hard requirement |
| Add substantial new product surface (AI, external sources, deeper tools) | Ship a visual reskin of baseball.theater v2 |
| Move off Elastic Beanstalk to serverless-oriented hosting | Optimize the existing EB zip deploy |

Shared with v2 only where we **choose** it: brand, domain, audience, Patreon as **funding**, and any feature we explicitly carry forward.

---

## Working process

1. **Goals** (this doc) — why we’re rebuilding.
2. **Features** — product shape guided by G2/G4/G5; carry/cut from v2 as a menu.
3. **Visual design** — how those surfaces look and behave ([VISUAL-DESIGN](./VISUAL-DESIGN.md)); 2026 app, not a v2 chrome copy.
4. **Architecture** — systems for G1 + data/AI/auth goals; assume no v2 code path.
5. **Build** — only after features + architecture are good enough to implement against.

When debating a carry-over from v2, ask: *Would we build this if baseball.theater had never existed?* If no, cut or redesign.

### Using the v2 inventory

Treat [`../v2/FEATURES.md`](../v2/FEATURES.md) as a **menu**, not a backlog:

- **Carry** — still core to the product (may be redesigned UX)
- **Replace** — same job, different approach
- **Drop** — not worth bringing
- **Later** — post-MVP

v2 architecture is useful as a list of **problems to avoid or solve differently** (EB cost, shared egress funnel, open proxy, Patreon-as-auth, secrets-in-repo, etc.), not as a blueprint.

---

## Non-goals (initial)

- Line-by-line or package-by-package continuity with the v2 monorepo
- “Compatible with the old API” as a design constraint
- Keeping Elastic Beanstalk as the long-term host
- Keeping **Patreon OAuth** as the primary login (payments via Patreon are in-scope)
- Reinventing `baseball-theater-engine` unless we choose to

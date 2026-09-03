# Baseball Theater v3 — Intent

**Status:** Drafting  
**Relationship to v2:** Reference only. v3 is a **clean-slate product and architecture**. We do not inherit v2’s stack, deploy shape, proxy model, client state patterns, or “migrate the repo” constraints.

v2 docs under [`../v2/`](../v2/) exist so we can consciously decide what *capabilities* still matter—not so we can reuse how they were built.

---

## Goals (accepted)

These are the reasons v3 exists. Features and architecture should trace back here.

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

## Document set

| Doc | Purpose |
|-----|---------|
| [INTENT.md](./INTENT.md) (this file) | Goals, clean-slate framing, process |
| [FEATURES.md](./FEATURES.md) | What v3 *is* for users (keep / cut / add) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How v3 is built (greenfield) |
| [BACKLOG.md](./BACKLOG.md) | Checkable implementation stories (command-mapped AC) |
| [LOOP.md](./LOOP.md) | Loop/goal automation readiness + process |

---

## Working process

1. **Goals** (this doc) — why we’re rebuilding.
2. **Features** — product shape guided by G2/G4/G5; carry/cut from v2 as a menu.
3. **Architecture** — systems for G1 + data/AI/auth goals; assume no v2 code path.
4. **Build** — only after features + architecture are good enough to implement against.

When debating a carry-over from v2, ask: *Would we build this if baseball.theater had never existed?* If no, cut or redesign.

### Using the v2 inventory

Treat [`../v2/FEATURES.md`](../v2/FEATURES.md) as a **menu**, not a backlog:

- **Carry** — still core to the product (may be redesigned UX)
- **Replace** — same job, different approach
- **Drop** — not worth bringing
- **Later** — post-MVP

v2 architecture is useful as a list of **problems to avoid or solve differently** (EB cost, shared egress funnel, open proxy, Patreon-as-auth, secrets-in-repo, etc.), not as a blueprint.

---

## Open decisions (fill as we go)

Record durable choices here once made; details live in FEATURES / ARCHITECTURE.

| Decision | Status | Notes |
|----------|--------|-------|
| Product goals G1–G5 | **Accepted** | This doc |
| Product north star (one sentence) | Draft | See [FEATURES](./FEATURES.md#north-star) |
| Feature carry/cut | **Accepted** | [FEATURES](./FEATURES.md#carry--cut-from-v2-working-table); new themes ship when ready — no “MVP wow” gate |
| Data-access topology (schedule & game details) | **Accepted** | [ARCHITECTURE ADR-002](./ARCHITECTURE.md#adr-002--data-access-topology-for-schedule--game-details-accepted) |
| Hosting / runtime | **Accepted** | Leave EB; **Firebase (GCP)** — [ARCHITECTURE §2](./ARCHITECTURE.md#2-serverless-platform-choice), [ADR-005](./ARCHITECTURE.md#adr-005--hosting--runtime-accepted) |
| Auth vs payments | **Accepted** | Firebase Auth for session; Patreon OAuth = **linked account** for tier — [ADR-004](./ARCHITECTURE.md#adr-004--identity--patronage-accepted) |
| Auth sign-in methods | **Accepted** | **Email magic link** + **passkeys** (WebAuthn) — [ADR-004](./ARCHITECTURE.md#adr-004--identity--patronage-accepted) |
| Patreon account link | **Accepted** | OAuth link after BT login (tier sync); not a login method — [ADR-004](./ARCHITECTURE.md#adr-004--identity--patronage-accepted) |
| Free vs patron entitlements | **Accepted (carry)** | Same v2 gates minus dropped features; server-enforced — [FEATURES](./FEATURES.md#patronage--access-product-level) |
| AI provider(s), grounding, cost controls | Open | Serves G4 |
| Primary client paradigm | **Accepted** | **React + Vite SPA** (no SSR) — [ADR-003](./ARCHITECTURE.md#adr-003--client-delivery-accepted) |
| UI framework | **Accepted** | **Mantine** — [ARCHITECTURE ADR-008](./ARCHITECTURE.md#adr-008--ui-framework-accepted) |
| Package manager / monorepo | **Accepted** | **pnpm** workspaces — [ADR-003](./ARCHITECTURE.md#adr-003--client-delivery-accepted), [ADR-013](./ARCHITECTURE.md#adr-013--local-dev-testing-lint--cicd-accepted) |
| Test runner | **Accepted** | **Vitest** (+ React Testing Library, MSW as needed) — [ADR-013](./ARCHITECTURE.md#adr-013--local-dev-testing-lint--cicd-accepted) |
| External data sources (beyond MLB) | **Direction accepted** | Phased multi-source knowledge — [ARCHITECTURE §3](./ARCHITECTURE.md#3-external-sources--knowledge-layer-direction-accepted), ADR-009 |
| Impact curation / league digests | **Direction accepted** | Per-game impact-sort + day digests — [ARCHITECTURE §4](./ARCHITECTURE.md#4-impact-curation-pipeline), ADR-010 |
| Inning feed + game packages | **Direction accepted** | End-of-inning insights → final package → day rollup — [ARCHITECTURE §5](./ARCHITECTURE.md#5-inning-insight-feed--game-package), ADR-011 |
| Ports & adapters (Firebase isolation) | **Accepted** | [ADR-012](./ARCHITECTURE.md#adr-012--ports--adapters-accepted) |
| Local dev, testing, lint, CI/CD | **Accepted** | Emulators + fixtures; Vitest coverage gates; Husky; GitHub Actions — [ADR-013](./ARCHITECTURE.md#adr-013--local-dev-testing-lint--cicd-accepted) |
| PWA / installability | **Drop (MVP)** | Responsive web only; no SW at launch — [FEATURES](./FEATURES.md#push-notifications-later) |
| Push notifications | **Later** | FCM; not blocked by PWA opt-out — [FEATURES](./FEATURES.md#push-notifications-later) |

---

## Non-goals (initial)

- Line-by-line or package-by-package continuity with the v2 monorepo
- “Compatible with the old API” as a design constraint
- Keeping Elastic Beanstalk as the long-term host
- Keeping **Patreon OAuth** as the primary login (payments via Patreon are in-scope)
- Reinventing `baseball-theater-engine` unless we choose to

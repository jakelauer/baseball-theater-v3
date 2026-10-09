# Baseball Theater v3 — Intent

**Status:** Living — edited as the vision changes  
**Origin story:** [ORIGIN.md](./ORIGIN.md) — the goals, clean-slate framing, and planning process v3 started from. Kept for provenance; where it disagrees with this doc, this doc wins.

This document says what Baseball Theater is trying to be **now**. [FEATURES](./FEATURES.md) says what users get; this says how the product is run.

---

## Pillars

Goals were the reasons v3 started. Pillars are how it is run, every day, by everyone working on it.

- **Delightful** — The experience is outstanding — good enough that people wonder how a tool this good exists.
- **Inventive** — Baseball Theater offers value found nowhere else in the world.
- **Dependable** — Fans can count on it, especially during games. When something upstream fails, they see slightly older data and keep going.
- **Secure** — Nobody can see or change another person's data or membership, and secrets never reach the browser or the repo.
- **Cost-conscious** — Every recurring cost has to earn its place. The juice must be worth the squeeze.
- **Flexible** — Keep options open: prefer decisions that can be undone, avoid lock-in, keep vendors and data sources swappable.

---

## Document set

| Doc | Purpose |
|-----|---------|
| [INTENT.md](./INTENT.md) (this file) | What BT is trying to be now: pillars, decision index |
| [ORIGIN.md](./ORIGIN.md) | Origin story: starting goals G1–G5, clean-slate framing, planning process (historical) |
| [FEATURES.md](./FEATURES.md) | What v3 *is* for users (keep / cut / add) |
| [VISUAL-DESIGN.md](./VISUAL-DESIGN.md) | How v3 looks and behaves (color, layout, interaction) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How v3 is built (greenfield) |
| [BACKLOG.md](./BACKLOG.md) | Checkable implementation stories (command-mapped AC) |
| [LOOP.md](./LOOP.md) | Loop/goal automation readiness + process |

---

## Open decisions (fill as we go)

Record durable choices here once made; details live in FEATURES / ARCHITECTURE.

| Decision | Status | Notes |
|----------|--------|-------|
| Product goals G1–G5 | **Accepted** (origin) | [ORIGIN](./ORIGIN.md#goals-accepted) — why v3 began; not re-evaluated as current |
| Pillars | **Accepted** | This doc |
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
| Visual design / brand | **Drafting** (direction accepted) | 2026 tactile UI; Primary `#CE0F0F` + Dark/Light/Accents; no logos / marketing photo chrome / ads / headlines — Live headshots + Videos highlight thumbnails OK — [VISUAL-DESIGN](./VISUAL-DESIGN.md) |

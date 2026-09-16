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

![[S21]]

---

![[S16]]

---

![[S17]]

---

![[S18]]

---

![[S19]]

---

![[S20]]

---

![[S28]]

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
| **Generated DAL adoption** (`openapi-fetch` as the fetch layer; drop hand-written route-path literals from `web/src/api/client.ts`) | ADR-016 | Split out of **S29** by the 2026-09-16 review. S29 keeps the fidelity guard (generated types + mutual-assignability gate), which is ADR-016's stated value; this is the rest. **Trigger — promote to a story when *either* holds:** (T1) a consumer outside this monorepo reads the spec — it is published (docs site / Swagger UI / external distribution), or a non-TypeScript or separately-deployed client is started, i.e. ADR-016's "Still open" resolves yes; or (T2) S29's fidelity gate goes red, or a second route family lands whose call sites need path/param typing (S4 standings, S5 search, a players route). **Carry these two when it is sliced:** (a) `web/src/api/client.ts` builds its URLs in backtick template literals (`` `/api/v1/games/${gamePk}` ``) independently of the route key it passes to `getJson`, so route and response type can disagree with nothing to catch it — a cheap non-codegen fix is to derive the path from the route key; (b) the old S29 AC 5 grep was written as `"/api/v1/` (double-quote-prefixed) and would have matched only the two assertions in `web/src/api/client.test.ts`, missing the real literals in `client.ts` — any grep here must cover backticks |
| Internal API explorer (Swagger UI / redoc over `openapi/bt-api.v1.json`) | ADR-015 "Still open" · FEATURES carry | FEATURES carries "ApiTest / swagger explorer" as internal/dev-only, but **no story owns it** and S27 put publishing the spec explicitly out of scope. Found by the 2026-09-16 review. Slicing it is also trigger T1 for the Generated DAL adoption row above — the moment a human reads the spec as documentation, its fidelity stops being hypothetical |

---

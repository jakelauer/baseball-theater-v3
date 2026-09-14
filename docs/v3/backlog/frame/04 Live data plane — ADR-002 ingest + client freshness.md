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

---

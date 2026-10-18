## Live data plane — ADR-002 ingest + client freshness

Aligned with [ARCHITECTURE §1 / ADR-002](./ARCHITECTURE.md#1-foundational-data-topology-accepted-direction): MLB egress is **backend-only** and scales with **game windows**, not viewer count. Clients read **BT**. Live feel comes from **BT freshness + delivery**—**not** per-tab MLB. Per [ADR-020](./ARCHITECTURE.md#adr-020--live-delivery--cadence-durable-objects-accepted-2026-10-18) / [ADR-022](./ARCHITECTURE.md#adr-022--idempotent-updates-accepted-2026-10-18) (2026-10-18): a per-game **ingest** Durable Object writes Postgres, then publishes versioned updates to **hub** object(s) that push one-way over hibernated WebSockets, in-window games only; everything else is cached HTTP with graduated freshness ([ADR-021](./ARCHITECTURE.md#adr-021--graduated-cache-freshness-accepted-2026-10-18)).

```text
MLB  →  typed fetch (S11–S13)  →  project to BT store shapes (S21)
                                      │
            cron → ingest object per game (S48, from S16) / refresh-on-read (S17 → S47)
                                      │  apply-if-newer, versioned (S43, S46)
                                      ├─ write Postgres (S46 ports → S50 adapter)
                                      │
                                      └─ then publish  →  hub object(s) (S18)  →  one-way WebSocket  →  watched UI (S19; S20 polls the cached schedule)
```

![[S21]]

---

![[S16]]

---

![[S17]]

---

![[S43]]

---

![[S47]]

---

![[S48]]

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
| Patreon OAuth link + entitlement refresh | ADR-004 / ADR-019 | After S8. Refresh tokens encrypted in Postgres (ADR-018); webhooks deduped on Patreon's event ID and set the tier rather than adjust it (ADR-022) |
| Cloud-synced settings (patron) | FEATURES patronage | After S6 + S8 |
| AppShell pairing chrome (rail on desktop, off on medium) | VISUAL-DESIGN §5 | After S24; host picks mobile / medium / desktop |
| Extra host pairings beyond mobile / medium / desktop | VISUAL-DESIGN §5 | Not wanted — three pairings are accepted |
| Team colors on scoreboard/standings modules | VISUAL-DESIGN §3 | Data accent, never logos |
| No-spoilers for free-text titles (video/recap strings) | VISUAL-DESIGN §5a | Product rule — structured scores ≠ title copy; not a UI blank of numerals |
| Cloudflare deploy (`wrangler deploy` via GitHub Actions; preview against a Neon branch) + environments + IaC | ADR-017 / ADR-013 | Unassigned until the owner is ready to deploy (owner, 2026-10-18). Changing CI/deploy needs the owner's go-ahead. Must exist before S28's "first public deploy" |
| Replay artifact retention in Postgres JSONB + post-final trigger | ADR-018 (retention still open) | Prod target for S22; ADR-018 rules out R2/object storage for BT data |
| Cadence parameter tuning (lead/trail/interval) | ADR-002 open knobs | Config once S48 exists; out-of-window lifetimes are ADR-021's tunable ladder |
| Logto adapter + web `AuthClient` + sign-in screen | ADR-019 | After S8; needs a sign-in design story first (rule 18). Logto email: code, plus link in the same email if Logto supports both (owner, 2026-10-18) |
| Regional live hubs | ADR-020 | Only if speed calls for it — a Worker routing-rule change on top of S18 |
| Multi-source deep links Phase 1 | ADR-009 | |
| Impact Phase B / day digest | ADR-010 | |
| Inning insight feed + game package | ADR-011 | AI enrichment keyed by `(gamePk, version)` so a retry reuses its result (ADR-022) |
| Web Push notifications (VAPID, from a Worker) | FEATURES Later · ADR-017 | Server transitions, not a substitute for S18 watched-game UX. Dedupe record `(gamePk, event, userId)` under a unique constraint before sending (ADR-022) |
| ~~**Generated DAL adoption**~~ **Sliced into S49 by the 2026-10-18 review.** (`openapi-fetch` as the fetch layer; drop hand-written route-path literals from `web/src/api/client.ts`) | ADR-016 | Split out of **S29** by the 2026-09-16 review. S29 keeps the fidelity guard (generated types + mutual-assignability gate), which is ADR-016's stated value; this is the rest. **Owner, 2026-10-14: no trigger — "No, our own client should use it."** ADR-016 stands unamended; the next backlog review slices this into a story. (Former triggers T1 external consumer / T2 fidelity gate red or a second route family are retired.) **Carry these two when it is sliced:** (a) `web/src/api/client.ts` builds its URLs in backtick template literals (`` `/api/v1/games/${gamePk}` ``) independently of the route key it passes to `getJson`, so route and response type can disagree with nothing to catch it — a cheap non-codegen fix is to derive the path from the route key; (b) the old S29 AC 5 grep was written as `"/api/v1/` (double-quote-prefixed) and would have matched only the two assertions in `web/src/api/client.test.ts`, missing the real literals in `client.ts` — any grep here must cover backticks |
| Internal API explorer (Swagger UI / redoc over `openapi/bt-api.v1.json`) | ADR-015 "Still open" · FEATURES carry | FEATURES carries "ApiTest / swagger explorer" as internal/dev-only, but **no story owns it** and S27 put publishing the spec explicitly out of scope. Found by the 2026-09-16 review. Slicing it is also trigger T1 for the Generated DAL adoption row above — the moment a human reads the spec as documentation, its fidelity stops being hypothetical |

---

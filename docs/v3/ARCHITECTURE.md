# Baseball Theater v3 — Architecture

**Status:** Drafting (goals G1–G5 + data topology; **Firebase accepted** for hosting/runtime — ADR-005)  
**Depends on:** [INTENT.md](./INTENT.md) (Goals), [FEATURES.md](./FEATURES.md)  
**v2 reference (anti-patterns / lessons only):** [`../v2/ARCHITECTURE.md`](../v2/ARCHITECTURE.md)

This document defines **how v3 is built**. It shares **no assumed continuity** with the v2 monorepo, CRA SPA, Express proxy, Elastic Beanstalk zip, Dynamo/ES layout, or `baseball-theater-engine` package. Anything reused is a conscious choice recorded here.

Do not fill unrelated stack choices until FEATURES has at least a north star and MVP sketch—or call out assumptions explicitly as provisional.

---

## Architecture principles

_Edit as we agree._

1. **Greenfield** — optimize for the v3 product, not for migrating v2 code.
2. **Server-owned schedule & game data** — clients read Baseball Theater’s copy; MLB is an upstream the backend pulls on a policy (see §1 / ADR-002).
3. **Serverless-oriented cost shape** — leave always-on Elastic Beanstalk economics; prefer pay-for-use / event-driven compute aligned with game windows and traffic (Intent G1 / ADR-005).
4. **Enrichment & AI are first-class pipelines** — not afterthoughts bolted onto a proxy (Intent G2, G4).
5. **Auth ≠ payments** — BT identity separate from Patreon; Patreon remains the funding channel (Intent G3 / ADR-004).
6. **Entitlements enforced where it matters** — server (or edge) authority for paid capabilities; UI gating alone is insufficient.
7. **Secrets and config stay out of the repo** — and out of world-readable deploy artifacts.
8. **Clear boundaries** — UI, domain/API, ingestion/cache, enrichment/AI, identity/billing as separable concerns.
9. **Observable by default** — logs, errors, cost, and key product metrics from the start.
10. **Ship in slices** — architecture should allow MVP without building every future theme.
11. **Ports, not platforms** — Firebase sits behind interfaces at persistence, auth, and secrets (ADR-012); domain logic stays portable TypeScript.
12. **Local dev without the cloud** — default workflow runs on emulators + fixtures; no GCP project, Patreon, or MLB required to hack (ADR-013).
13. **Quality gates are automatic** — tests, coverage floors, and lint are enforced on commit and merge; builds fail on lint (ADR-013).

---

## 1. Foundational data topology (accepted direction)

**Reject v2’s pattern:** user browser → BT `/api/proxy` → MLB (N users amplify shared egress).

**Adopt:** the backend is the system of record *for the product* for **schedule** and **game details**. Clients connect to Baseball Theater’s data (API, push, or equivalent)—not to MLB JSON via a per-user relay.

### Two modes

| Mode | When | Behavior |
|------|------|----------|
| **Active cadence** | From a configurable lead time **before** scheduled start, through the game, until a configurable trail time **after** official end | Backend **proactively** checks MLB (or derived sources) on an interval / schedule and updates BT-owned game/schedule state |
| **Cache / on-demand** | Outside that window | Stored BT data is served as a **cache**. A **user request may trigger a refresh** from MLB if data is missing or stale per policy—without turning every page view into an open proxy fan-out |

Exact lead/trail durations, poll intervals, and staleness rules are **TBD parameters**, not product unknowns: the *shape* is decided.

### Scope of this decision (for now)

| In scope (server-driven as above) | Still open / later |
|-----------------------------------|--------------------|
| Schedule (scoreboard / day’s games) | Highlight search, media catalogs, Fastball-style search |
| Game details (live feed projection, box, plays, status, etc. as we model them) | Whether video *discovery* metadata follows the same cadence |
| Client UX for those surfaces reads **BT data** | Whether clients ever talk to MLB directly for anything |

Video **file** URLs may still be played from MLB/CDN hosts; that is delivery of media bytes, not the v2 Stats-API proxy pattern.

### Why this shape

- **Bounded MLB egress** — active polling scales with *game windows*, not with concurrent viewers
- **Coalescing** — one backend refresh serves everyone watching that game/day
- **Room for product logic** — BT can normalize, enrich, and notify on top of owned state
- **Clearer trust boundary** — no open URL proxy required for core game UX

### Implications (to design next)

- Need a **store** for schedule + game snapshots (and likely freshness metadata: `fetchedAt`, `windowMode`, etc.)
- Need a **scheduler / worker** that knows which games are in-window and what to pull
- Client “live” feel comes from **BT freshness + delivery** (poll BT, SSE/WebSocket, etc.—mechanism TBD), not from each tab hitting MLB
- Out-of-window refresh-on-read needs **single-flight / rate limits** so a stampede on an old game doesn’t recreate shared-egress overload

```
                    ┌─ Active window: cadence pulls ────────┐
                    │                                       │
 MLB / upstream  ◄──┤  Backend ingestion                    │
                    │                                       │
                    └─ Outside window: refresh on demand ───┘
                                    │
                                    ▼
                           BT schedule + game store
                                    │
                                    ▼
                              Client (reads BT)
```

---

## 2. Serverless platform choice

**Status:** **Accepted — Firebase (GCP)** ([ADR-005](#adr-005--hosting--runtime-accepted))  
**Your criteria:** (1) maintainable without continual effort · (2) stable · (3) cost-effective · (4) industry-accepted

AWS serverless and Cloudflare remain valid alternatives; the comparison below is retained as rationale. None of the three require you to become a full-time SRE if you stay inside their “happy path.”

### What the platform must do well

| Need | Why |
|------|-----|
| **Scheduled / recurring work** | In-window game cadence (ADR-002) |
| **Document (or KV) store** | BT-owned schedule + game snapshots + freshness metadata |
| **HTTPS API (or callable)** | Clients read BT data; Patreon webhooks; AI endpoints |
| **Auth** | BT identity ≠ Patreon (ADR-004)—built-in or easy third-party (Clerk, etc.) |
| **Fan-out / queues (nice)** | Refresh many in-window games without one giant function |
| **Low ops** | Solo/small maintenance; few moving parts to babysit |
| **Predictable $** | Beat always-on EB; avoid surprise read/egress bills |

Live push to clients (Firestore listeners, WebSockets, SSE) is **desirable** but not required on day one—clients can poll BT.

### Options compared

Scores are relative for *this* product and criteria (higher = better fit). Not absolute quality rankings.

| Criterion | **Firebase (GCP)** | **AWS serverless** | **Cloudflare** |
|-----------|--------------------|--------------------|----------------|
| (1) Low continual effort | **5** — Auth, Firestore, Functions, Scheduler, Hosting are one console/CLI story | **3** — Extremely capable; easy to assemble too many services unless you adopt **SST / Amplify Gen 2 / CDK patterns** and stick to them | **4** — Small surface (Workers + bindings); you assemble auth/patterns yourself |
| (2) Stable | **5** — Long-lived, boring in a good way | **5** — Gold standard uptime/ecosystem | **4** — Production-proven; younger “full app backend” story than AWS/Firebase |
| (3) Cost-effective | **3–4** — Usually << EB for BT scale; **watch Firestore read amplification** if every client chats the DB naively | **4** — Excellent if designed (Lambda + DynamoDB on-demand + EventBridge); easy to overbuild | **5** — Typically cheapest at modest scale; generous free tiers |
| (4) Industry-accepted | **4** — Extremely common for product apps; slightly less “enterprise default” than AWS | **5** — Default industry vocabulary | **3–4** — Fast-growing acceptance; fewer “hire anyone” résumés than AWS |
| Fit for ADR-002 cadence | **Strong** — Cloud Scheduler → Functions; store games in Firestore | **Strong** — EventBridge Scheduler → Lambda; DynamoDB (or similar) | **Strong** — Cron (min **1 min**) + **Durable Object alarms** for sub-minute / per-game ticks |
| Fit for “clients read BT” | **Excellent** — Firestore realtime listeners map cleanly to live game docs | **Good** — API poll or AppSync/API Gateway + optional push | **Excellent** — Workers + DO can hold per-game state / WebSockets |
| Fit for AI calls | **Good** — Functions call OpenAI/Vertex; watch timeouts/cost | **Good** — Lambda / Step Functions; Bedrock optional | **Good** — Workers AI or external APIs; CPU/time limits matter for heavy jobs |
| Main risks | Google lock-in; Firestore cost if chatty clients; cold starts on sparse functions | Complexity / YAML sprawl; decision fatigue | Auth not batteries-included; DO mental model; less tutorial depth for “whole product” |

### Reference shapes (illustrative)

**Firebase**

```text
Cloud Scheduler  →  Cloud Functions (ingest in-window games → MLB)
                 →  write Firestore (schedule / game docs)

Client (Mantine) →  Firebase Auth
                 →  Firestore reads/listeners  and/or  HTTPS Functions
Patreon webhook  →  Function → entitlements on user
AI               →  Function (grounded on Firestore game docs)
Hosting          →  Firebase Hosting (static SPA)
```

**AWS**

```text
EventBridge Scheduler  →  Lambda (ingest)  →  DynamoDB
API Gateway / Function URLs  →  Lambda (read APIs, webhooks, AI)
Cognito or Clerk  →  JWT on APIs
Optional: SQS between scheduler and per-game workers
Front door: CloudFront + S3 or SSR on Lambda elsewhere
```

Prefer **SST** (or Amplify Gen 2) so infra stays code-defined and the service count stays intentional.

**Cloudflare**

```text
Cron Trigger (e.g. every minute)  →  Worker lists in-window games
                                  →  Durable Object per game (alarms for faster cadence)
                                  →  DO storage / D1 / KV as BT store
Client → Worker API (and/or DO WebSocket)
Auth → Clerk/Auth0/Firebase Auth (external) + JWT checks in Worker
Patreon webhook → Worker
AI → Worker or queued elsewhere for long jobs
```

### Decision (accepted)

**Firebase (GCP)** for Baseball Theater v3.

| Why | Detail |
|-----|--------|
| Matches criterion (1) best | One productized stack for auth + DB + schedule + HTTP + hosting; less “which of 12 AWS services?” |
| Matches ADR-002 + live UX | Game documents in Firestore; optional realtime without inventing a socket layer on day one |
| Stable + accepted enough | Widely used; ops model is well understood; fine for a serious consumer app |
| Cost | Should undercut EB at BT’s scale if you **design reads** (server APIs or careful listeners—not unbounded client queries) |
| Ops transfer | Scheduler → function → store → API patterns transfer to AWS/Cloudflare later if needed |

**Rejected for v3 core path (for now):** AWS+SST and Cloudflare-primary — strong alternatives, but higher assembly cost for a solo/small maintainer at this stage.

### Locked service map (Firebase)

| Concern | Service | Notes |
|---------|---------|-------|
| **BT data store** | **Firestore** | Schedule + game snapshots, freshness metadata, user entitlements, crosswalks, enrichment/curation artifacts |
| **Ingestion + APIs** | **Cloud Functions (2nd gen)** | MLB poll/upsert (ADR-002), read APIs, Patreon webhooks, AI/enrichment jobs |
| **Cadence** | **Cloud Scheduler** | Triggers in-window ingest; may fan out per game/day via function logic |
| **Auth** | **Firebase Auth** | BT sessions (email/social TBD); Patreon remains payments only (ADR-004) |
| **Web app** | **Firebase Hosting** | Mantine SPA static assets (ADR-003/008) |
| **Secrets** | **Secret Manager** | Patreon, AI keys, any upstream credentials — not in repo |
| **Large blobs** | **Cloud Storage** (optional) | Crosswalk imports, Savant CSV snapshots, static exports |
| **Local dev** | **Firebase Emulators** | Functions + Firestore + Auth |

**Client read path (default):** browsers call **HTTPS Functions** (or Hosting rewrites to Functions) for schedule/game JSON — not direct Firestore listeners on hot game docs. Keeps read/egress predictable under ADR-002. Firestore listeners or short-poll remain an option for live UX once shaped.

**Optional later:** Cloudflare (or similar) CDN in front of Hosting + cacheable GET APIs to trim GCP egress — not required for MVP.

```text
Cloud Scheduler  →  Cloud Functions (ingest in-window games → MLB)
                 →  write Firestore (schedule / game docs)

Client (Mantine) →  Firebase Hosting (static)
                 →  Firebase Auth
                 →  HTTPS Functions (read APIs; cache-friendly GETs)
Patreon webhook  →  Function → entitlements on user doc
AI / enrichment  →  Function (grounded on Firestore)
```

### Anti-patterns (any provider)

- Recreating v2 **open proxy** “because serverless makes it easy”
- One giant always-on container “just for a while” (that’s EB again)
- Client apps hammering the datastore every second × N users (blows up Firebase especially)
- Sub-second MLB polling for every game without a budget (cost and ban risk)
- Mixing two clouds for core path without a clear reason (ops doubles)

### Rough monthly cost (order-of-magnitude)

**Not a quote** — illustrative model for Baseball Theater’s ADR-002 shape (server ingest of ~10–15 in-window games; clients reading BT). Prices change; verify before committing. **AI token spend is excluded** and can exceed all of this.

| Scenario | Firebase | AWS serverless | Cloudflare Workers |
|----------|----------|----------------|--------------------|
| Quiet (offseason / low traffic) | ~**$0–5** | ~**$3–8** | ~**$0–5** (free) or **$5** (paid floor) |
| Typical season month | ~**$10–25** | ~**$10–20** | ~**$5–15** |
| Busy + chatty DB listeners | ~**$40–80** | ~**$25–40** | ~**$15–30** |
| v2-ish EB reference | Often ~**$25–60+** always-on compute/LB alone (before ES/other) | same if you keep EB | — |

**What drives the bill**

| Driver | Firebase | AWS | Cloudflare |
|--------|----------|-----|------------|
| Ingest function calls | Usually inside free tier | Usually inside free tier | Inside Paid included requests |
| Game doc writes | Cheap; often near free quota | Cheap on DynamoDB on-demand | Cheap on D1/KV included |
| **Client reads** | Cheap per op, but **naive realtime listeners × every ingest write** scale reads fast | API poll or Dynamo reads; more predictable if you design access | KV/D1 reads; Paid includes large allotments |
| **Egress to MLB** (functions fetching Stats JSON) | Often a **large** Firebase line (~$0.12/GB after free) | Similar (~$0.09/GB class rates) | **Usually $0** egress on Workers — structural win |
| Hosting / bandwidth | Can add tens of $ if traffic spikes | CloudFront similar | Included / cheaper edge story |
| Auth | Firebase Auth free for normal MAU | Cognito free tier / or Clerk etc. | External IdP (Clerk…) often separate |

**Takeaway for BT**

- At **sensible design** (API or carefully bounded listeners, not N clients billed on every 30s game write), **all three are likely ≪ EB** and in the **~$5–25/mo** band for a typical season.
- **Cloudflare** tends **cheapest** at this scale (Paid **$5** floor, no MLB egress tax).
- **Firebase vs AWS** are close for core infra; Firebase loses more if you lean hard on chatty Firestore listeners or large function egress.
- **Do not pick on $5/mo differences** — pick on ops comfort (criterion 1). Cost only becomes decisive with large concurrent live audiences *and* chatty sync.
- **Budget AI separately** (OpenAI/Vertex/etc.); see [§2.1 AI token cost intuition](#21-ai-token-cost-intuition).

### 2.1 AI token cost intuition

You don’t need to “guess usage” as one number. Split spend into **two meters**:

| Meter | Scales with | Controllable? |
|-------|-------------|---------------|
| **A — Precompute** (rank videos, day digest, game summary) | **Games / days** (~450 MLB games/month in season) | Yes — run once (or N times) per game; cache forever for that version |
| **B — On-demand** (chat / Q&A / agent) | **User actions** | Yes — entitlements, rate limits, cheaper model, shorter context |

**Rule of thumb:** ~750 English words ≈ **1,000 tokens**. A compact “feature pack” for one game (clip list + key scoring plays + linescore) is often **~3–8k input tokens**. A short ranked list or paragraph is **~0.5–2k output**.

**Illustrative API rates** (order-of-magnitude; change often):

| Tier | Example | ~Input / 1M | ~Output / 1M |
|------|---------|-------------|--------------|
| Cheap | GPT-4o-mini–class | **$0.15** | **$0.60** |
| Mid | GPT-4o–class | **$2.50** | **$10** |

#### Meter A — season month if you precompute (shared by all users)

Assume ~**15 games/day × 30 days ≈ 450 games**, one model call each unless noted:

| Job | ~Tokens in→out | Cheap model | Mid model |
|-----|----------------|-------------|-----------|
| Impact re-rank once/game | 4k → 1k | ~**$0.50** | ~**$9** |
| Same, **3×** during live | ×3 | ~**$1.50** | ~**$27** |
| League-day digest once/day | 20k → 2k × 30 | ~**$0.15** | ~**$2** |
| AI game summary once/final | 8k → 1.5k × 450 | ~**$1** | ~**$16** |
| **Bundle** (rank + digest + summary, once each) | — | ~**$2** | ~**$25–30** |

So: **all of the “intelligent curation” you care about can stay in coffee-money range** if it’s **server-side, cached, and not re-run per page view**. Heuristic Phase A is **$0** AI.

#### Meter B — on-demand chat (this is where bills surprise people)

One grounded Q&A turn ≈ **6k in + 0.5k out**:

| Chats / month | Cheap | Mid |
|---------------|-------|-----|
| 500 | ~**$0.60** | ~**$10** |
| 2,000 | ~**$2** | ~**$40** |
| 5,000 | ~**$6** | ~**$100** |
| 20,000 | ~**$24** | ~**$400** |

Multi-step **tool agents** (several model calls per session) are roughly **2–5×** a single chat turn.

#### How to plan without knowing traffic

1. **Ship Meter A first** (impact sort / digest / summary) on a **cheap** model + cache → budget **~$5–30/mo** mid-tier worst case for a full season month of precompute.
2. **Gate Meter B** (Q&A) behind patronage and/or daily caps → you choose the ceiling (e.g. “patrons get 20 chats/day” ⇒ hard max cost).
3. Prefer **structured inputs** (JSON feature packs), not dumping full live feeds every time.
4. Use **Batch API** / off-peak jobs for digests when latency doesn’t matter (~half price on some providers).
5. Keep a **monthly $ cap** + alert on the AI provider from day one.

**Instructions vs fine-tuning**

- **System/developer instructions count as input tokens** on each call (or as cached input if the provider supports prompt caching—often much cheaper on repeat).
- Longer “be a baseball analyst…” prompts raise **Meter A/B a bit**, but usually less than dumping a full live feed. Prefer a **short fixed rubric** + **structured JSON game pack**.
- **Fine-tuning is optional, not required** for inning notes / packages / impact sort. Start with: heuristics → prompted small model + schema → evaluate quality. Fine-tune only if a stable task still fails after good prompts/examples.
- Fine-tune tradeoff: upfront training + hosting a custom model; inference can be cheaper/faster *if* volume is high and the task is narrow—not a default for v1.

**Bottom line:** For BT, AI cost is mostly a **product policy** question (“how often do we call the model, and who can chat?”), not an unknowable cloud mystery. Precompute is cheap and predictable; open-ended chat is the knob that can go from **~$5** to **hundreds**. Prompt length matters at the margins; **call count and model tier** dominate. Fine-tuning is a later optimization, not a prerequisite.

---

## 3. External sources & knowledge layer (direction accepted)

**Status:** Product direction accepted · **phasing open**  
**Maps to:** Intent G2, G4; FEATURES “Multi-source knowledge”

MLB Stats API gives BT a **canonical spine** (`playerId`, `teamId`, `gamePk`, …). FanGraphs, Baseball-Reference, Baseball Savant, and mlb.com **marketing pages** use different identifiers and expose **different** value (bWAR vs fWAR vs Statcast vs video). v3 should treat these as a **knowledge ecosystem**, not as “extra URLs we might hardcode someday.”

### Design stance

| Principle | Why |
|-----------|-----|
| **MLB ID is the hub** | What the live game feed already gives us; everything else is **crosswalk + optional fetch** |
| **Links before mirrors** | Deep links are cheap, legal-simple, and immediately useful (Phase 1) |
| **Server-side fetch only** | No browser relay to arbitrary sites; ingestion/agents run on BT infrastructure with budgets |
| **Cache foreign facts** | If we display bWAR or Statcast inline, store **snapshots + `fetchedAt` + source** — don’t hit FanGraphs/BBRef per page view |
| **Agents are orchestrators, not scrapers-in-the-wild** | LLM + **tool registry** per approved source; grounded on BT entities and cached pulls |
| **Respect ToS and rate limits** | Prefer public APIs / established ID registers / licensed data where possible; avoid re-hosting entire third-party databases |

### Logical architecture

```text
                    ┌─────────────────────────────────────┐
                    │  Clients (Mantine)                  │
                    │  · deep link chips (Phase 1)        │
                    │  · inline foreign metrics (Phase 3) │
                    │  · AI answers (Phase 4)             │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  BT APIs / agent gateway            │
                    │  (entitlements, rate limits)        │
                    └──────────────────┬──────────────────┘
           ┌───────────────────────────┼───────────────────────────┐
           ▼                           ▼                           ▼
   Entity catalog              Snapshot store                 AI / analysis
   (players, teams,           (metric blobs per              (tools read catalog
    games + crosswalks)         source + TTL)                  + snapshots + game docs)
           │                           │
           └───────────┬───────────────┘
                       ▼
              Connectors (per source)
              · URL builder (Phase 1)
              · fetch + parse (Phase 3+)
              · agent tools (Phase 4)
                       │
       ┌───────────────┼───────────────┬───────────────┐
       ▼               ▼               ▼               ▼
     MLB           FanGraphs         BBRef          Savant
   (ingest)      (crosswalk/       (crosswalk/     (often MLB id;
                  fetch TBD)        fetch TBD)       statcast + video)
```

This layer is **orthogonal to ADR-002** game cadence: crosswalks update slowly; foreign metrics can refresh on longer TTLs than live pitch data.

### Entity resolution (how linking actually works)

**Goal:** Given `mlbPlayerId` (from box score / play), produce stable outbound links:

| Destination | Typical mapping approach | Notes |
|-------------|------------------------|-------|
| **mlb.com** | Direct from `playerId` | Authoritative for BT spine |
| **Baseball Savant** | Often same MLB `playerId` in URLs | Play/video links may use `playId` from live feed |
| **FanGraphs** | FanGraphs `playerid` ≠ MLB id | Needs **crosswalk** (community tables, Chadwick-style registers, or one-time backfill job) |
| **Baseball-Reference** | `bbref_id` slug (e.g. `troutmi01`) | Crosswalk from MLB id; v2 had unused `bbref-links` helper — don’t port, **redesign** |

**BT entity catalog (conceptual):**

```text
players/{mlbPlayerId}
  displayName, teamIds, …
  links: { mlb, fangraphs, bbref, savant }   # Phase 1 — URLs only
  foreignMetrics?: {                          # Phase 3+
    fangraphs?: { war, …, fetchedAt }
    bbref?: { war, …, fetchedAt }
    savant?: { …, fetchedAt }
  }
```

Resolution strategies (can combine):

1. **Static / bulk crosswalk** — import maintained ID maps (e.g. Chadwick Bureau, Retrosheet, open-source MLB↔BBRef projects); refresh periodically.
2. **Lazy resolution** — on first sighting of a player in a season, server job resolves missing crosswalk keys once, then caches forever (or until stale policy).
3. **Heuristic + verify** — name + team + DOB match across sources (fallback only; log ambiguities).
4. **Agent-assisted disambiguation** — for hard cases or Q&A (“which Ryan?”), not for hot-path box score links.

Phase 1 should **not** require AI — deterministic crosswalk + URL templates.

### Phased engineering (aligned with FEATURES)

| Phase | Build | Store | Risk |
|-------|-------|-------|------|
| **1 — Deep links** | URL builders + crosswalk for players (teams later) | `links` on player entities | Low |
| **2 — Source literacy** | Metadata per source (“best for fWAR”); agent system prompts | `sources` config | Low |
| **3 — Snapshots** | Connectors fetch **small** metric sets; normalize schema | `foreignMetrics` + TTL | Medium (ToS, parsing drift) |
| **4 — Agent aggregation** | Tool-using agent over connectors + BT game docs | Conversation + cached tool results | Medium–high (cost, quality) |

**Not in scope for Phase 1:** Scraping full stat pages; user-visible “import everything from FanGraphs.”

### Connector pattern (implementation sketch)

Each approved source gets a **connector** with a narrow interface:

```text
resolvePlayer(mlbPlayerId) → { externalIds, profileUrls }
fetchPlayerSnapshot(mlbPlayerId, fields[]) → normalized blob  # Phase 3+
```

Connectors run only in **serverless jobs / agent tools**, with:

- per-source rate limits and circuit breakers
- structured logging when HTML/layout changes break parsers
- no generic “fetch any URL” endpoint

### AI / agent role (Phase 4+)

Agents add value when they can:

- **Choose** which source answers a question (“wRC+ → FanGraphs”)
- **Combine** BT-owned game state with foreign snapshots
- **Explain** provenance (“bWAR per Baseball-Reference, as of …”)
- **Summarize** without inventing numbers (tool calls required for facts)

Agent gateway sits behind entitlements (G3/G4); free tier might get links only, patrons get aggregation/Q&A.

### Open technical choices

- Which crosswalk dataset to seed v1 (evaluate Chadwick / pybaseball-style registers / manual curation for active rosters)
- Savant: public CSV/API endpoints vs HTML for anything beyond `playId` video links
- FanGraphs / BBRef: links-only indefinitely vs licensed/partner path for metrics
- Whether Phase 3 metrics are **display-only** with outbound attribution vs fully inline UX

### Research notes (feasibility — 2026)

**Verdict:** Phase 1 (deep links) is **clearly realistic**. Phase 3–4 (inline foreign metrics / agent fetch) is **realistic for Savant-shaped Statcast**, **risky/unclear for FanGraphs & BBRef** without permission or a licensed feed. Do not plan the product on scraping Sports Reference or FanGraphs at scale.

#### Crosswalks (MLB id → everyone else) — **solved problem**

| Source | What you get |
|--------|----------------|
| **[Chadwick Bureau Register](https://github.com/chadwickbureau/register)** | Public CSVs with `key_mlbam`, `key_fangraphs`, `key_bbref`, `key_retro`, etc. Open Data Commons Attribution. Updated ~weekly (public lag vs paid full register). |
| **pybaseball / baseballr** | Thin wrappers over Chadwick for lookup/reverse lookup; ecosystem standard |

**BT approach:** Periodic job imports Chadwick → `players/{mlbId}.links.{fangraphs,bbref,…}`. Coverage for active MLB players is excellent; watch nulls for brand-new call-ups until the next register refresh (fallback: omit link or resolve lazily).

URL builders once IDs exist (patterns are stable):

- BBRef: `https://www.baseball-reference.com/players/{firstLetter}/{bbref_id}.shtml`
- FanGraphs: player pages keyed by FanGraphs id (and often discoverable with mlbam id in their UI)
- Savant: player/play URLs commonly use **MLBAM ids** and/or `playId` from the live feed (same spine as Stats API)

#### Per source — link vs fetch

| Source | Deep links | Fetch / aggregate stats | Notes |
|--------|------------|-------------------------|-------|
| **mlb.com / Stats API** | Easy | Already ADR-002 | Canonical spine |
| **Baseball Savant** | Easy (often same MLBAM id; `playId` for clips) | **Feasible** | Statcast search exposes **CSV downloads**; docs list `player_id` as MLB ids. Community libs pull date/player slices. Still: cache, rate-limit, attribute; not a blank check for unbounded scrape |
| **FanGraphs** | Easy via Chadwick `key_fangraphs` | **Hard for a commercial site** | No public developer API. CSV export is a **membership** feature aimed at personal use. ToS restricts commercial exploitation of the service. Community scrapers exist; **not a sound production dependency** for baseball.theater without asking FG / buying data |
| **Baseball-Reference** | Easy via Chadwick `key_bbref` | **Hard / discouraged** | **No public API** (they say licenses with upstream providers block it). [Bot policy](https://www.sports-reference.com/bot-traffic.html): rate limits (~20 req/min on BBRef; jail on abuse). [Data use](https://www.sports-reference.com/data_use.html): no automated harvest that substitutes for their product; custom data asks start ~$5k+. **Deep linking is the supported fan pattern** |

#### What “figure it out” should mean for v3

| Goal | Realistic? | How |
|------|------------|-----|
| Link player → MLB / FG / BBRef / Savant | **Yes** | Chadwick + URL templates |
| Savant video / pitch deep links from live `playId` | **Yes** | Already adjacent to v2 |
| Inline Statcast (EV, LA, etc.) on plays | **Yes, carefully** | Savant CSV / bounded server fetch → snapshot store; ToS/rate discipline |
| Inline fWAR / bWAR on BT pages | **Not via scrape** | Partner/license, manual curated subset, or **link out** and show “view on FanGraphs/BBRef” |
| Agent “read all sites and merge” | **Partial** | Agent uses **BT snapshots + approved connectors**; not free-form browsing of FG/BBRef HTML |

**Recommendation:** Treat Phase 1 as a near-certain win. Treat Savant as the first **fetch** target for G2. Treat FanGraphs/BBRef metrics as **link + optional future license**, not as scrapers you build the roadmap on.

---

## Lessons from v2 (problems to solve or consciously accept)

| v2 pattern | Risk / cost | v3 stance |
|------------|-------------|-----------|
| Browser-orchestrated fetches via open `/api/proxy` | Shared egress; rate-limit blast radius; SSRF/open-relay trust | **Rejected** for schedule & game details (ADR-002) |
| Client-only Patreon gates | Trivial to bypass | Enforce on trusted boundary |
| Secrets in `keys.json` in deploy zip | Leak / rotation pain | External secret store / env |
| Dual video stacks (GraphQL + ES + tag APIs) | Complexity, drift | Unify or deliberately split with reasons |
| SPA + thin relay as “backend” | Hard to add BT-owned intelligence | Real data plane + ingestion |
| Elastic Beanstalk always-on app | Cost floor unrelated to traffic/games | **Leave EB**; serverless-oriented (ADR-005) |
| Patreon OAuth as session identity | Auth UX coupled to payments vendor | **Replace auth**; keep Patreon for payments (ADR-004) |

Full context: v2 architecture §1 (proxy model) and §9–11.

---

## Target picture (partial)

```
┌─────────────────────────────────────────┐
│ Clients (React SPA — ADR-003)             │
│  schedule + game UX ← BT APIs / sync    │
│  AI / insight / curated lists ← BT APIs │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Application boundary (Firebase Functions) │
│  auth · entitlements · read APIs · …    │
└─────────────────┬───────────────────────┘
                  │
     ┌────────────┼────────────────┬──────────────────┐
     ▼            ▼                ▼                  ▼
 Identity    Schedule +      Enrichment / AI     Other data
 (BT auth;   game store      (derived + LLM)     (media, …)
  Patreon     (BT-owned)           ▲
  = pay)            ▲              │
                    │              │
                    └──── ingestion + analysis jobs ────┘
                                  │
                                  ▼
                    MLB + other upstreams (entity catalog, connectors)
```

_Entity catalog & crosswalks: [§3](#3-external-sources--knowledge-layer-direction-accepted)._

---

## Major decision records

Use short ADRs in-place. Status: `Proposed` → `Accepted` → `Superseded`.

### ADR-001 — Clean slate (accepted)

**Decision:** v3 does not inherit v2 implementation.  
**Why:** Serious rearchitecture; Intent goals G1–G5; v2 stack is end-of-life for this product line.  
**Consequence:** New repo/layout and stack are expected; v2 remains the live site until cutover strategy says otherwise.

### ADR-002 — Data-access topology for schedule & game details (accepted)

**Decision:** Hybrid **server-owned** model:

1. **In-window cadence** — Backend polls/checks for updates from a defined time before first pitch through a defined time after the game ends, and keeps BT’s schedule/game state current.
2. **Out-of-window cache** — Outside that window, BT serves cached/stored data; **user-driven requests may trigger a refresh** subject to staleness and coalescing policy.
3. **Clients read BT** — For schedule and game details, the user connection is driven by the server’s data, not by proxying the user’s session through to MLB.

**Why:** Escape v2’s per-viewer MLB fan-out; bound upstream load to game activity; enable a real product data layer for G2/G4.

**Consequence:**

- Ingestion + storage are mandatory for core UX (not optional cache in front of a proxy)
- “Live” UX is designed against BT freshness guarantees
- Parameters still open: pre-game lead, post-game trail, poll interval(s), TTL / when refresh-on-read fires
- Media/search and other domains need separate ADRs; they do not automatically inherit this pattern

**Not decided here:** transport to clients (HTTP poll vs push), database product, exact MLB endpoints, multi-sport, etc.

### ADR-003 — Client delivery (accepted)

**Decision:**

- **UI library:** **React** (current stable major at scaffold time)
- **Delivery model:** **SPA only** (no SSR framework for v3) — **Vite** dev/build, static assets on **Firebase Hosting**
- **UI kit:** **Mantine** (ADR-008)
- **Package manager:** **pnpm** workspaces monorepo (ADR-013)

**Why:** Matches v2 familiarity without CRA; fast local dev; pairs with Firebase Hosting, emulators, and Vitest. Next.js / full SSR rejected as unnecessary complexity for an interactive game viewer (accepted Aug 2026).

**SEO / sharing:** Google can index JS-rendered SPAs; client-side titles/meta are sufficient for MVP. **Social link previews** (Open Graph for Discord/Slack) may need a small server-side or edge OG hook later — not a reason to adopt SSR for the whole app.

**Still open:** React Router vs TanStack Router; data-fetching library (TanStack Query likely).

**Not chosen:** Next.js, Remix, React Router framework mode — separate server runtime; revisit only if product becomes content/SEO-first.

### ADR-004 — Identity & patronage (accepted)

**Decision:**

- **Authentication / session identity:** **Not** Patreon OAuth. **Firebase Auth** only (ADR-005).
- **Sign-in methods (v1):** **Email magic link** and **passkeys** (WebAuthn). No password login required at start; Google/social optional later if needed.
- **Patreon link (not login):** After the user has a BT session, they **link Patreon via OAuth** so BT can read **pledge / subscription tier**. Patreon is a **linked account**, never the session IdP.
- **Payments / membership funding:** **Remain on Patreon**.
- **Entitlements:** BT maps linked Patreon pledge/tier onto **server-enforced** capabilities. Product gates **carry v2** (Backer → Pro → Star → Premium) minus features we dropped (Cast, Teams, etc.) — see [FEATURES](./FEATURES.md#patronage--access-product-level).

**Why:** Intent G3 — better login UX and cleaner identity ownership without abandoning existing supporter economics. Magic link + passkeys minimize password friction. Patreon OAuth stays only where it’s needed: **knowing the tier**.

**Link flow (target):**

```text
User signs in (magic link / passkey) → BT session
User connects Patreon once (OAuth) → store on users/{uid}:
  patreonUserId, refreshToken (secret), linkedAt
Access tokens expire; refresh without user interaction
Campaign webhooks and/or scheduled refresh → update entitlements
```

**Tiers without re-auth:** Yes. Cookie-only tokens in v2 forced re-login every session. As a **permanent link**, store the **refresh token** server-side (Secret Manager or encrypted field). Refresh access tokens and call `/identity` with `memberships.currently_entitled_tiers` without the user being present. Prefer **campaign webhooks** (member create/update/delete) so upgrades/cancels update entitlements in near real time. User only re-OAuths if they revoke the app or tokens die.

**Consequence:**

- Migration from v2: existing patrons create/sign in with BT auth, then **link** Patreon once (may need one-time identity matching help)
- Feature gates check **BT entitlements**, not "logged in with Patreon"
- Tier names/benefits can still mirror Patreon rewards
- Emulator + fixture auth/entitlements for local/CI (ADR-013)
- Treat refresh tokens as secrets—not cookies

**Still open:** webhook vs poll balance; entitlement schema on `users/{uid}`; email delivery for magic links in prod (Firebase templates / custom SMTP); optional unlink UX.


### ADR-005 — Hosting & runtime (accepted)

**Decision:** **Leave Elastic Beanstalk**. Run v3 on **Firebase / Google Cloud** (serverless-oriented).

**Why:** Intent G1; lowest assembly cost for auth + DB + schedule + HTTP + hosting (see [§2](#2-serverless-platform-choice)).

**Consequence:**

- ADR-002 ingestion = Cloud Scheduler → Cloud Functions → Firestore
- Clients: Firebase Hosting + Auth + HTTPS Functions (see locked service map in §2)
- Blaze billing plan expected for Functions/egress beyond free tiers

**Still open:** cold-start budget, multi-env (dev/staging/prod), IaC choice (Firebase CLI vs Terraform), optional CDN layer.

### ADR-006 — Data stores (accepted, narrowed)

**Decision:** **Firestore** as the primary document store for BT-owned data.

**Collections / domains (illustrative, not final schema):**

- `schedule/{date}` — day scoreboard snapshot + metadata
- `games/{gamePk}` — live/final game projection + `fetchedAt`, window mode
- `users/{uid}` — profile, Patreon link, entitlements
- `catalog/players` (or import table) — Chadwick crosswalk + refresh metadata
- `enrichment/...` — game packages, insight feeds, curation outputs (ADR-010/011)

**Why Firestore:** Native to Firebase stack; fits document-shaped schedule/game payloads; supports server-side reads from Functions without exposing hot paths to every client.

**Still open:** exact document shapes, indexes, retention/TTL for old games, whether any relational slice needs BigQuery export later.

### ADR-007 — AI & enrichment (direction accepted)

**Decision:** Explicit **enrichment / AI** path grounded on BT-owned (and other) data for analysis, statistical commentary, summaries, and **curation** (Intent G2, G4). Includes **multi-source knowledge** ([§3](#3-external-sources--knowledge-layer-direction-accepted)), **impact curation** ([§4](#4-impact-curation-pipeline), ADR-010), and the **inning feed / game package** pipeline ([§5](#5-inning-insight-feed--game-package), ADR-011).

**Still open:** model providers, grounding rules, caching of generations, cost caps, free vs patron outputs.

### ADR-008 — UI framework (accepted)

**Decision:** Use **[Mantine](https://mantine.dev/)** as the UI component framework for the v3 web client.

**Why:** Chosen preference for v3; replaces v2 Material UI v4.

**Consequence:** Mantine-first design system; no second general-purpose component library without an ADR. App framework remains ADR-003.

**Still open:** Mantine major version at kickoff; theme; brand tokens.

### ADR-009 — Multi-source knowledge (direction accepted)

**Decision:** Baseball Theater will build a **phased external-source layer** anchored on MLB IDs:

1. **Phase 1 (minimum):** Deterministic **deep links** to mlb.com, FanGraphs, Baseball-Reference, and Baseball Savant for players (teams/games as mappings allow).
2. **Later phases (extent TBD):** Cached **foreign metric snapshots**, then **agent-orchestrated** multi-source fetch/analysis—always server-side, cached, and source-attributed.

**Why:** Intent G2/G4/G5; user-requested; links alone are high value; aggregation is a structured ramp, not a big-bang scrape.

**Consequence:**

- **Entity catalog + crosswalk** is a first-class data concern (ADR-006), separate from live game cadence (ADR-002)
- **Connectors per source**; no revival of v2 open proxy
- AI features should use connectors/tools, not hallucinate cross-site stats
- Legal/ToS and rate limits are design inputs from Phase 3 onward

**Still open:** Phase 1 scope for MVP; which crosswalk seed data; per-source fetch vs links-only forever for FanGraphs/BBRef.

### ADR-010 — Impact curation & league digests (direction accepted)

**Decision:** v3 includes a **ranking / curation pipeline** that:

1. **Per game:** Orders (or tiers) highlight videos by **game impact** and surfaces **interesting** clips/plays beyond pure leverage.
2. **Per date (league-wide):** Produces digests of the most interesting **videos, plays, stats, and accomplishments** across that day’s games.
3. Is ideally driven by the same **AI / agent layer** that can consume BT-owned data and (later) multi-source connectors—not a permanent one-off sort hardcoded only in the UI.

**Why:** Core G4/G5 differentiator; answers “what should I watch?” better than MLB’s default media order; replaces the *intent* of dropped Featured Videos with something smarter.

**Consequence:**

- Curation artifacts are **BT-owned** and **cached** (e.g. `rankings` on game doc; `dayDigest/{yyyymmdd}`)
- Prefer **compute on ingestion cadence / post-game trail** (ADR-002 window), not on every client request
- Bootstrap with **heuristics** (Phase A) so UX works before full LLM spend; models refine later
- Ranking inputs start from live feed + media; expand via ADR-009

**Still open:** Exact impact features; when digests finalize (live vs end-of-day); free vs patron gating; model vs pure heuristic for MVP.

### ADR-011 — Inning feed & game package pipeline (direction accepted)

**Decision:** Enrichment runs on **baseball state transitions**:

1. **End of inning** → consume current BT game stats/plays for that game → append **insight items** to an in-game feed (snippets, notable stats, things to note).
2. **Game final** → produce a durable **game package** (what mattered: plays, videos, lines, accomplishments, narrative beats).
3. **Day digest / league rollup** → **reads game packages** (primary), not a fresh full-league raw re-analysis every time.

**Why:** Natural cadence; predictable Meter A AI cost (~1 call/inning + 1 package/game); clean dependency for ADR-010 day digests; live UX without per-user generation.

**Consequence:**

- Ingestion (ADR-002) must expose reliable **inning boundary** and **final** detection
- Store `insightFeed` (append-only) and `gamePackage` (replace-on-final, versioned)
- Impact video ranking can run inside package build and/or refine on package
- Idempotent handlers: same inning end must not duplicate feed items

**Still open:** Heuristic vs model for inning items; whether mid-inning “big play” interrupts are allowed later; package schema v1.

### ADR-012 — Ports & adapters (accepted)

**Decision:** Isolate **Firebase-specific** code behind narrow **ports** (interfaces). Domain types and orchestration depend on ports only; Firebase SDKs live in `adapters/firebase`.

| Port (examples) | Firebase adapter | Consumers |
|-----------------|------------------|-----------|
| `ScheduleRepository`, `GameRepository` | Firestore | Ingest, read APIs |
| `UserRepository`, `EntitlementsService` | Firestore | Auth flows, Patreon sync |
| `AuthVerifier` | Firebase Admin (`verifyIdToken`) | HTTP handlers |
| `SecretsProvider` | Secret Manager | Functions bootstrap |
| `MlbStatsClient` | HTTP → Stats API | Ingest (plus `FixtureMlbStatsClient` for local) |

**Why:** ADR-005 without painting into a corner; migration cost lands in adapters, not product logic.

**Consequence:**

- Shared `packages/domain` + `packages/ports` (names TBD); **no** `DocumentReference` in handlers.
- SPA calls **BT HTTP APIs**, not Firestore directly (also ADR-002 cost discipline).
- Second cloud adapter is **not** built until needed—one impl per port is enough.

### ADR-013 — Local dev, testing, lint & CI/CD (accepted)

**Decision:** Engineering workflow requirements for v3:

| Requirement | How |
|-------------|-----|
| **Local dev with minimal external setup** | Firebase **Emulator Suite** + committed **fixtures**; `pnpm dev` starts web + emulators; no Blaze project required for day-to-day work |
| **Extensive automated tests + coverage metrics** | **Vitest** (unit + integration); coverage via **v8**; reports in CI |
| **Tests must pass before merge** | GitHub **branch protection** requires CI `test` job; optional **pre-push** hook runs full suite locally |
| **Lint at build time** | `pnpm build` runs **lint** first (fails build on lint errors) |
| **Lint on commit** | **Husky** + **lint-staged** — ESLint (with fix where safe) + Prettier on staged files |
| **CI build + deploy** | **GitHub Actions** — on PR/push: install → lint → test (coverage) → build; on `main`: deploy to Firebase (Hosting + Functions) |

**Local dev model (serverless without the cloud):**

```text
pnpm dev
  ├─ Vite (web) ──────────► http://localhost:5173
  ├─ Firebase Emulators
  │    ├─ Auth      (9099)
  │    ├─ Firestore (8080)
  │    ├─ Functions (5001)  ← same handler code as production
  │    └─ Hosting   (5000) optional
  └─ Seed script loads fixtures/ (schedule + sample games) into emulator Firestore

External calls in local mode:
  MLB Stats API  → FixtureMlbStatsClient (default) or live if BT_USE_LIVE_MLB=1
  Patreon        → StubEntitlements / fixture webhook payloads
  AI providers   → StubEnrichment or recorded responses
```

**Emulators are not a different codebase** — Functions and Firestore adapters detect `FIRESTORE_EMULATOR_HOST` / emulator env and talk to local instances. Production deploy uses the same artifacts.

**Coverage policy (initial — tune when codebase exists):**

| Scope | Floor (lines) | Notes |
|-------|---------------|-------|
| `packages/domain` | **90%** | Pure logic; highest bar |
| `packages/ports` + adapters | **80%** | Repos, auth verifier, MLB client |
| `functions` handlers/services | **75%** | Integration tests against in-memory ports |
| `web` | **60%** → raise later | Component tests; e2e optional Phase 2 |

CI fails if coverage drops below thresholds (`vitest --coverage`).

**Tooling stack (proposed at scaffold):**

- **pnpm** workspaces monorepo
- **TypeScript** strict
- **ESLint** + **Prettier** (shared config root)
- **Husky** + **lint-staged**
- **Vitest** + **@vitest/coverage-v8** — default test runner for Vite + TypeScript monorepo (still the 2026 greenfield default vs Jest for this stack)
- **React Testing Library** + **user-event** — component tests
- **MSW** — mock HTTP in web + handler tests where useful
- **GitHub Actions** + Firebase deploy action (service account secret)

**Still open:** exact coverage thresholds per package; Playwright e2e in MVP or v3.1; staging project vs preview channels; Codecov vs built-in artifact only.

---

## 4. Impact curation pipeline

**Status:** Direction accepted (ADR-010) · implementation open  
**Product detail:** [FEATURES — Impact curation](./FEATURES.md#impact-curation-g2-g4-g5)

### Mental model

```text
BT game docs (plays, linescore, media)
        │
        ├──► §5 inning insights (live feed)
        │
        └──► §5 game package (on final)
                    │
                    ├──► video impact order (ADR-010)
                    └──► day digest inputs (ADR-010)
```

Day digests should **prefer finished game packages** over re-walking raw feeds.

### Why not rank in the browser

- Needs **full play context** joined to clips (often incomplete in client-only media lists)
- Should be **shared** across all viewers of a game (coalesce compute)
- Fits serverless jobs on **inning/final transitions** and post-game trail
- Keeps API keys and model calls server-side

### Heuristic bootstrap (Phase A)

Cheap signals available from Stats API–shaped data BT already stores:

| Signal | Use |
|--------|-----|
| Runs scored on play / score went from tie or deficit to lead | Boost impact |
| Walk-off / extra innings / late innings | Boost |
| Home run, steal of home, triple play, etc. | Boost + “interesting” |
| Media keywords (`walk-off`, `home-run`, `diving`, …) | Soft boost when play link missing |
| Recap / condensed game | Pin or separate tier (“full story”) vs single-play clips |

Output: stable ordered list of media ids + optional labels (`impact`, `highlight`, `curiosity`).

### Model / agent layer (Phase B–D)

- **Input:** Structured feature bundle per candidate clip/play (not raw “sort these URLs” with no context)
- **Output:** Scores + short rationale (for UI and debugging); store with `modelVersion` / `promptVersion`
- **Agent path:** Same tools as multi-source knowledge—pull rarity (Savant), season context (FanGraphs), etc., when ranking “interesting”
- **League digest:** Aggregate top-N from **game packages** for a date; recompute as late games finish and packages appear

### Storage sketch

```text
games/{gamePk}/curation
  videoOrder: [{ mediaId, score, labels[], rationale? }]
  computedAt, method: heuristic|model|agent

games/{gamePk}/package          # ADR-011 — see §5
days/{yyyymmdd}/digest
  sources: [gamePk…]            # packages consulted
  topVideos[], topPlays[], topStats[], accomplishments[]
  computedAt, coverage: { gamesFinal, gamesInProgress }
```

### Open design knobs

- Live re-rank during game vs only inside final package
- How aggressively to demote ceremonial / interview clips in “impact” sort
- Digest as a **page** vs modules on the scoreboard
- Entitlement: free users get heuristic order; patrons get model digests—or everyone gets both

---

## 5. Inning insight feed & game package

**Status:** Direction accepted (ADR-011) · implementation open  
**Product detail:** [FEATURES — Inning / game insight pipeline](./FEATURES.md#inning--game-insight-pipeline-g2-g4-g5)

### Pipeline

```text
ADR-002 ingest detects:
  linescore.inning advanced / isTopBottom flipped  →  INNING_END
  status → final                                     →  GAME_FINAL

INNING_END(gamePk, inning, half?)
  → load BT snapshot (box, scoring plays this inning, cumulative lines)
  → optional: new media since last tick
  → producer (heuristic | model)
  → append insight items to games/{gamePk}/insightFeed

GAME_FINAL(gamePk)
  → load full BT game + media + insightFeed
  → build games/{gamePk}/package
       · narrative / key moments
       · impact-sorted videos (or pointer to curation)
       · standout batting/pitching lines
       · accomplishments / milestones
       · raw refs (playIds, mediaIds) for provenance
  → enqueue day-digest refresh for game’s date
```

### Insight item (sketch)

```text
{
  id, gamePk, inning, half?, createdAt,
  kind: note | stat | play | video | accomplishment,
  title, body?,
  refs: { playIds[], mediaIds[], playerIds[] },
  salience: number,   # for feed ranking / day rollup
  method: heuristic | model
}
```

### Game package (sketch)

```text
{
  gamePk, finalAt, version,
  headline,
  keyMoments[],          # ordered
  videoOrder[],          # or link to curation doc
  standoutLines[],
  accomplishments[],
  insightHighlights[],   # best items from inning feed
  method, modelVersion?
}
```

### Triggering vs polling

- **Do not** schedule “AI every minute for every game” blindly.
- On each ADR-002 ingest tick: compare previous vs new state; if inning boundary or final **transition**, fire the corresponding job **once** (idempotency key: `gamePk:inning:half` or `gamePk:final`).
- Extra innings: same INNING_END path.

### Cost intuition (Meter A)

Season month ~450 games × ~10 innings ≈ **4,500 inning jobs** + **450 packages**.

| If each job is mini-class ~3k in / 400 out | Ballpark |
|---------------------------------------------|----------|
| Inning insights only | ~**$3–6**/mo |
| + packages | ~**$5–10**/mo |
| Mid-tier model for both | often ~**$50–150**/mo |

Still far more predictable than per-user chat. Heuristics for “stat notes” can zero out most inning AI until you want prose.

### Open design knobs

- Top of inning vs end of full inning only
- Quiet innings: skip model if heuristic finds nothing (save $)
- Package rebuild if late media arrives in post-game trail
- Whether insight feed is free; package depth patron-gated

---

## System contexts (to flesh out)

### Clients

Read schedule and game state from BT. Live updates reflect ingestion cadence / push—not per-tab MLB polls. Mechanisms TBD (ADR-003). Host AI/insight UI against BT APIs. **UI: Mantine (ADR-008).**

### Application / API layer

Expose BT-owned schedule and game resources; auth session; entitlement-aware AI/insight endpoints. Refresh-on-read for out-of-window paths must be **safe under concurrency** (single-flight per game/day key). Prefer serverless-friendly request handling (ADR-005).

### Data ingestion & cache

**Primary path (ADR-002):**

- Discover which games are inside `[start − lead, end + trail]`
- On cadence, fetch upstream and upsert BT state
- Outside window: serve store; optionally refresh when a reader hits stale/missing data

**Parameters to specify later**

| Parameter | Intent | Value |
|-----------|--------|-------|
| Pre-game lead | When active polling starts | TBD |
| Post-game trail | When active polling stops | TBD |
| In-game / in-window interval | How often to check while active | TBD (may differ pre/live/post) |
| Out-of-window TTL / stale rule | When a user request triggers refresh | TBD |
| Coalescing | Merge concurrent refresh triggers | Required |

### Enrichment & AI

- Jobs or request-time handlers that use BT game/schedule (and later other sources) as **grounding**
- **Multi-source connectors** and entity crosswalks ([§3](#3-external-sources--knowledge-layer-direction-accepted), ADR-009)
- **Impact curation** — per-game video ranking + league-day digests ([§4](#4-impact-curation-pipeline), ADR-010)
- **Inning feed + game packages** ([§5](#5-inning-insight-feed--game-package), ADR-011) — day digests consume packages
- Outputs stored or streamed for clients (recaps, summaries, analysis, deep links, foreign metrics, curated lists, live insight feeds)
- Cost, rate limits, and entitlement checks are part of the design—not optional

### Identity, billing, entitlements

- **BT auth** for sessions — magic link + passkeys (ADR-004)
- **Patreon OAuth** only to **link** an account and sync **pledge/tier** (not a login)
- Sync path: OAuth link + webhook and/or periodic refresh → entitlements on the user record
- Migration: v2 Patreon-session users → BT auth, then reconnect Patreon

### Media playback

_TBD_ — discovery vs file delivery; offline. Not covered by ADR-002 unless we extend it.

### Observability & ops

_TBD_ — at least: ingestion lag, upstream error rate, refresh-on-read rate, per-game window membership, **AI cost/latency**, **auth/Patreon sync health**, **infra cost**.

### Security baseline

- **No open SSRF-style MLB proxy** for core schedule/game UX
- Secret management; entitlement checks; **rate limits / budgets** on MLB-facing egress and AI providers
- Separate auth tokens from Patreon credentials

---

## Repo & package shape

**Status:** Direction accepted (ADR-012/013) · layout finalized at scaffold

**Monorepo (pnpm workspaces):**

```text
baseball-theater-v3/
  packages/
    domain/          # types, pure logic (no Firebase imports)
    ports/           # interfaces only
  functions/
    src/
      adapters/firebase/
      adapters/fixtures/   # FixtureMlbStatsClient, stubs
      handlers/
      services/
  web/                 # Vite + Mantine SPA
  fixtures/            # JSON seed data for local dev & tests
  .github/workflows/   # ci.yml, deploy.yml
  firebase.json        # emulators + deploy targets
```

**Scripts (target DX):**

| Script | Does |
|--------|------|
| `pnpm dev` | Emulators + seed + Vite (one command, zero cloud setup) |
| `pnpm test` | Vitest all packages |
| `pnpm test:coverage` | Vitest + thresholds |
| `pnpm lint` | ESLint entire repo |
| `pnpm build` | **lint** → typecheck → web build → functions build |

**Assumptions:**

- New codebase under `baseball-theater-v3` (this workspace)
- No requirement to import v2 packages

---

## 6. Developer experience, testing & delivery

See **ADR-013** for the full decision. Summary:

### Local development

Goal: **`git clone` → `pnpm install` → `pnpm dev`** — no Firebase console, no API keys, no Patreon app.

1. **Firebase Emulator Suite** runs Auth, Firestore, and Functions locally.
2. **`fixtures/`** holds schedule/game JSON (from real MLB responses, checked in). A seed script loads them into the emulator on `pnpm dev`.
3. **Ports + fixture adapters** satisfy ingest and read paths without network.
4. **Optional live mode:** `BT_USE_LIVE_MLB=1` + emulator still fine for storage; for debugging upstream only.

This is how serverless local dev works: you’re not running “mini GCP,” you’re running **the same function code** against **local emulated services** and **fake upstreams**.

### Testing

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | Domain logic, mappers, impact heuristics, coordinate math |
| Integration | Vitest | Handlers calling in-memory port fakes; adapter tests against emulator (optional CI job) |
| Rules | `@firebase/rules-unit-testing` | Firestore security rules when added |
| E2E | Playwright (later) | Smoke paths through deployed preview |

Tests run in CI on every PR. Coverage report uploaded as CI artifact (Codecov optional).

### Lint & commit hooks

| When | What |
|------|------|
| **Commit** (lint-staged) | ESLint + Prettier on staged files |
| **Build** | Full-repo lint (hard fail) |
| **CI** | Lint + test + build (required checks) |

### GitHub Actions

**`ci.yml`** (pull_request + push to `main`):

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm test:coverage`
4. `pnpm build`

**`deploy.yml`** (push to `main`, after CI green):

1. Build artifacts
2. `firebase deploy --only hosting,functions` using `FIREBASE_SERVICE_ACCOUNT` secret
3. (Optional) preview deploy per PR via Firebase Hosting channels

**Branch protection on `main`:** require `ci` workflow success before merge.

---

## Open architecture questions

_None of these block scaffolding. Defaults are fine until tuned._

1. Concrete **lead / trail / interval / TTL** values (and whether they vary by status)?
2. Client sync: **poll Functions API**, **Firestore listeners**, or hybrid? (Default: poll Functions API.)
3. Historical highlight index (v2 ES) vs live MLB GraphQL search?
4. **Patreon** OAuth link + webhook/refresh + patron migration UX (auth methods locked: magic link + passkeys; Patreon ≠ login)
5. AI provider(s) when enrichment ships; heuristic vs model for first impact-sort
6. Crosswalk seed + refresh when Phase 1 deep links ship
7. **Scaffold repo** (stack locked — do this next)
8. Cutover mechanics when ready (dns, beta, flags)
9. Any client→MLB direct path (e.g. GraphQL search CORS)?

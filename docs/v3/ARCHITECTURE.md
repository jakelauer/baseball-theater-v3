# Baseball Theater v3 — Architecture

**Status:** Drafting (goals G1–G5 + data topology; **Firebase accepted** for hosting/runtime — ADR-005)  
**Depends on:** [INTENT.md](./INTENT.md) (Goals), [FEATURES.md](./FEATURES.md)  
**Visual / UX:** [VISUAL-DESIGN.md](./VISUAL-DESIGN.md) (theme, layout, interaction — not stack)  
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

**Data fetching / client state:** Settled in [ADR-014](#adr-014--client-state-management-accepted) — **TanStack Query** for the server read cache, with settings, session, navigational, and ephemeral view state kept as separate concerns.

**Still open:** React Router vs TanStack Router (routing only; ADR-014 does not depend on the choice).

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

**Still open:** Theme and brand tokens — drafting in [VISUAL-DESIGN.md](./VISUAL-DESIGN.md). Mantine major in the scaffold is **7**.

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

### ADR-014 — Client state management (accepted)

**Decision:** Client state is **five separate concerns**. Only the first one gets a caching library; the other four must not be folded into it.

#### Client state kinds

| Kind | Holds | Home | Authority |
|------|-------|------|-----------|
| **Server read cache** | Schedule day, game document, standings, search results, replay artifacts | **TanStack Query** cache — one entry per BT store document | BT API (ADR-002) |
| **Navigational** | Date, `gamePk`, room/tab, search query | URL via React Router | The route when the view owns it; the host otherwise |
| **Settings** | Favorites, entry room, color mode, sort, autoplay | One persisted store, read **directly** by views | The user (local first; patron sync later) |
| **Session + entitlements** | Firebase Auth user, server-enforced tier | Its own provider — **not** a cache entry | BT server (ADR-004) |
| **Ephemeral view** | Selected pitch, open at-bat, video position, nav drawer, layout `variant` | Local component state, or a prop from the host | The view (the host, for `variant`) |

```text
   BT /api/*  ─────────────►┐
   (authoritative)          │
                            ├──►  server read cache  ──►  views (typed hooks)
   BT SSE / poll (S18) ────►┘      (one entry per            ▲   ▲   ▲
                                    BT document)             │   │   │
   URL (date / gamePk / room) ──────────────────────────────►┘   │   │
   settings store (persisted) ──────────────────────────────────►┘   │
   local view state + host variant ─────────────────────────────────►┘

   session + entitlements ──► views,  and invalidates the read cache on change
```

**Rules:**

1. **One cache entry per BT store document.** Cache identity mirrors the projected **BT store shapes** — one entry per game, per schedule day, per standings date — not per component that happens to fetch. Every view of the same game (header, Live room, a compact pane hosted beside the scoreboard) reads that one entry and moves together. Keys are produced by that resource's descriptor (rule 9), never typed out at a call site.
2. **TanStack Query owns the read cache**, behind a thin BT layer (key factory + typed hooks in `web/src/api/`). Views never build a key and never call `fetch`. Resolves ADR-003's open data-fetching question.
3. **Freshness is server-declared.** Staleness derives from `windowMode` and `fetchedAt` on the payload, not from client constants. An `active`-window game refreshes; a `cache`-window game does not. Patron "faster live refresh" (FEATURES) is a server-supplied policy value, not a client `if`.
4. **Push and pull share one cache.** The S18 stream writes into the same key a one-shot read populated. There is no parallel "live game" object — that is exactly what lets a header and a Live room disagree.
5. **Views fetch their own data. Route loaders are not the data layer.** [VISUAL-DESIGN §5](./VISUAL-DESIGN.md) requires a game view hostable outside its own route (compact pane beside an expanded scoreboard), so data belongs to the view keyed by entity. React Router stays declarative.
6. **Settings are read directly by views**, from one persisted store. No presentation-profile layer between settings and views ([VISUAL-DESIGN D11 / §5a](./VISUAL-DESIGN.md#5a-settings-that-change-presentation)). Readable at render, so a view can sort or emphasize without an effect.
7. **Session and entitlements live in their own provider** and **invalidate** server data when they change, rather than being merged into it.
8. **Ephemeral and variant state stay local.** No global store entry for layout variant, drawer, or selected pitch. The host passes `variant` in.
9. **Type-safe end to end, one type source.** See below — non-negotiable.
10. **Follow-and-debug shape.** See below — a reader must be able to answer "where does this data come from and who changed it" by opening one file.

#### Type safety end to end (rule 9)

**One type source.** The types the handler returns are the types the view consumes: shared workspace packages (`@bt/domain`, plus `@bt/mlb-api` for **upstream** payloads only). `web/` already depends on `@bt/domain` and must keep doing so.

| Required | Forbidden |
|----------|-----------|
| Response types are named `<DomainType>Response` aliases of `@bt/domain` types (or the BT store-shape types it exports) — see [response aliases](#response-aliases--the-dto-seam-accepted-2026-09-13) | Hand-written response `interface`s in `web/`, or any client-side copy of a server shape |
| Route → response type declared once and consumed by **both** ends (see [the wire boundary](#the-wire-boundary-accepted)) | A second/parallel typing or validation stack on the client that can drift from the server's |
| Query descriptors that **bind a key to its payload type**, so `useQuery`, `getQueryData`, `setQueryData`, and `invalidateQueries` are all checked against that resource | Raw `["game", id]` string-array keys at call sites; unchecked `setQueryData` writes |
| `strict` TypeScript; no `any` in `web/src/api/` | `: any`, `as any`, `any[]`, or `as unknown as` to make a cache write compile |

**Mechanism:** each resource exports a **TanStack Query `queryOptions()` descriptor** (v5). That helper brands the key with its data type, so a cache write against `gameQuery(gamePk).queryKey` only accepts that game's payload type and a typo'd or wrong-shaped write is a **compile error**, not a runtime surprise. Views and stream handlers pass descriptors around; they never assemble key arrays by hand.

**What the descriptor does and does not prove.** A query descriptor infers its payload type from what `queryFn` *declares* it returns — a static inference, not knowledge of the wire. So the branding buys **internal consistency downstream of that declaration**: a cache entry cannot be read as the wrong type, and a stream handler cannot write a partial object or a raw upstream payload into a key a view reads as a full document. That is the bug class rule 4 depends on. It is **not** validation of what the server actually sent.

#### The wire boundary (accepted)

JSON on the wire is untyped, and that is a limitation of the medium rather than a design choice. The requirement is therefore: **data is typed right up to egress, typed again immediately on ingress, and the type comes from one place.** Runtime verification that the bytes match the type is **explicitly not required**.

**Decision — a typed BT API route contract.** One shared declaration maps each route to its response type (and its error-body type), and **both** ends consume that declaration. Routes are **version-prefixed** (`/api/v1/…`) and the table is **runtime-enumerable** so a spec can be generated from it — see [ADR-015](#adr-015--api-versioning--compatibility-accepted).

| End | Today (unbound) | Target |
|-----|-----------------|--------|
| Egress | `sendJson(res, status, body: unknown)` in `functions/src/handlers/api.ts` erases the type; nothing declares that `/api/games/:pk` returns `GameSnapshot` | `sendJson` is generic over the contract and keyed by route; each route sends through a `to<DomainType>Response` mapping function, so returning a wrong-shaped body **fails the `functions` typecheck** |
| Ingress | `getJson<T>` in [web/src/api/client.ts](../../web/src/api/client.ts) — the caller asserts the type it wants | The fetch helper is keyed by route and *derives* the `<DomainType>Response` type from the contract; call sites pass no type argument |

**Consequence:** exactly **one** unchecked `JSON.parse` → type step exists, inside the single ingress helper — not one per call site. Everything upstream and downstream of the wire is statically bound to the same declaration, so a handler and a view cannot disagree without breaking a typecheck.

**Not doing:** runtime response validation, and therefore **no** schema-first requirement. BT store shapes (S21) stay hand-written TypeScript types; no zod/valibot at the BT API boundary. Upstream MLB payloads keep their parsers in `@bt/mlb-api` — that is a different boundary, where the sender is not ours.

#### Response aliases — the DTO seam (accepted 2026-09-13)

Rule 9's "one type source" holds for today's single first-party client (`web/`), sharing a monorepo with the server. It stops holding the moment the API has a consumer that isn't ours to redeploy in lockstep — a third-party integration, a public API. That isn't planned (CLAUDE.md's product boundaries explicitly drop v2's public playback catalog APIs), but the seam to get there without a rewrite is cheap enough to lay now rather than retrofit later.

**Decision:** every route's response type in the [S26](./BACKLOG.md#s26--typed-bt-api-route-contract) table is a **named alias**, not the bare domain type — append `Response` to the domain type's name: `GameSnapshotResponse = GameSnapshot`, `ScheduleDayResponse = ScheduleDay`, and likewise for the error-body type. Declared beside the route table in `packages/domain/`, exported, and consumed by both ends — same "one declaration" rule 9 already requires, just named separately from its source.

The handler sends through a matching mapping function, `to<DomainType>Response(value: DomainType): <DomainType>Response`. Today that function is a **passthrough** — the alias is structurally identical to the domain type, so this is not a second, independently-authored shape and does not reopen the drift risk rule 9 forbids. Nothing to keep in sync exists yet.

**What this buys, for the price of one alias and one no-op function per route:** the domain type and the wire type are *named* separately even though they're *shaped* identically today. The day an internal-only reason forces a domain field to be removed, renamed, or reshaped while the wire needs to stay stable — the exact move a real external consumer would need protected — the seam to do it already exists: edit the mapping function to compute the old wire field from the new internal shape, and `<DomainType>Response` never has to change. Without this seam, that move isn't possible without touching the wire contract in the same commit as the internal refactor, because today they would be the same declaration.

**Still one type source, not two:** the alias is derived (`type XResponse = X`), not hand-copied, so there is nothing to maintain until a mapping actually diverges. If that day comes, the divergence lives in one named function, not scattered across handlers — and a mutual-assignability check (the same kind [S29](./BACKLOG.md#s29--generated-client-dal-from-the-openapi-spec) already uses for its fidelity gate) can keep proving the two stay in sync for as long as they're meant to.

**Not doing:** hand-authoring response shapes that diverge from the domain type today, or building a DTO catalog speculatively. This is a naming and indirection seam, not a parallel type system — that trade only gets made if a real external consumer shows up.

#### Follow-and-debug shape (rule 10)

Debuggability is a stated product-owner requirement, so it is a constraint, not a nicety.

| Rule | Why it helps |
|------|--------------|
| **One file per resource** under `web/src/api/` holding that resource's descriptor, hook, and cache writers | "How does a game load?" has one answer: open `web/src/api/game.ts` |
| **Hooks named for the thing** (`useGame`, `useScheduleDay`), returning the library's own states — not a bespoke wrapper type | Nothing to learn beyond the library; no second abstraction to step through |
| **Every cache write is a named exported function** in that resource file (e.g. `applyLiveGameUpdate`) | Grep the function name to find every writer. No inline `setQueryData` in a component or a stream callback |
| **No indirection layers** — no generic repository/service/facade over the query layer | The stack trace from a view to `fetch` is short and readable |
| **Query devtools enabled in dev builds** | Cache contents, key, freshness, and refetch reason are inspectable |
| **Freshness is visible**, not just internal (`fetchedAt` / `windowMode` already render per D9) | A stale screen is diagnosable by looking at it |

**Why:** The SPA already hand-rolls `useState` + `useEffect` + `fetch` + a `cancelled` flag per page, which cannot dedupe, cannot patch a loaded entity in place, and gives every new surface a fresh chance to invent its own pattern. Naming the five kinds keeps a server-cache library from swallowing settings and view state (the usual Redux-era failure), and keeps ADR-002's "clients read BT" honest by deriving client cadence from server-declared freshness. TanStack Query also supplies the mechanics the live-data backlog needs anyway: cache writes for push patching, interval + focus/visibility refetch for polling, and request cancellation.

**Consequence:**

- `web/` gains `@tanstack/react-query` (+ devtools as a dev dependency), a query provider, and a typed hook layer; the two existing pages migrate off ad-hoc effects.
- Live delivery (SSE/WebSocket/poll) becomes a **cache writer**, not a second state tree.
- Server response shapes become a **shared contract**: changing a handler's payload without updating `@bt/domain` breaks the web typecheck, which is the intended failure.
- Settings work stays compatible with D11 — the store is a settings store, not a view-model.
- Entitlement-aware refresh has one seam (server policy → query options) instead of tier checks scattered through views.

**Invariants (what later graders check):**

| Invariant | Serves |
|-----------|--------|
| Two mounted views of the same entity update together from a single cache write | Rule 1 |
| A live payload updates the same key a one-shot read used; no second live state | Rule 4 |
| A game update **patches in place** — open at-bat, selected pitch, and video position survive | [VISUAL-DESIGN D7](./VISUAL-DESIGN.md#1-design-goals) |
| No `fetch(` under `web/src/pages/` or `web/src/components/`; reads go through typed hooks | Rule 2 |
| No client constant contradicts `windowMode` | Rule 3, ADR-002 |
| No `presentationProfile` / intermediate settings object | Rule 6, D11 |
| No global store entry for `variant`, drawer, or selected pitch | Rule 8, D10 |
| Response types are imported from `@bt/domain`; no locally declared server-response shapes in `web/` | Rule 9 |
| A wrong-shaped handler response **fails the `functions` typecheck**; no `body: unknown` on success paths | Route contract |
| Ingress call sites pass **no** type argument; exactly one cast, inside the single fetch helper | Route contract |
| No `any` / `as any` / `as unknown as` under `web/src/api/`; no raw key arrays at call sites | Rule 9 |
| A wrong-typed cache write **fails typecheck** (proven by a type-level test, e.g. `@ts-expect-error`) | Rule 9 |
| Each resource has one file under `web/src/api/`; no `setQueryData` outside it | Rule 10 |
| Data layer is testable in jsdom with no network (MSW per ADR-013); CI stays offline | ADR-013 |

**Non-goals (do not drift into these):**

- **No normalized entity graph** / Redux-style store. S21 hands the client pre-projected documents; document-level keys are enough.
- **No mutation or optimistic-update strategy.** At MVP the only client writes are local settings; account writes arrive with ADR-004.
- **No offline persistence or service worker** — PWA is dropped for MVP ([FEATURES](./FEATURES.md)).
- **No client-side normalization of MLB payloads** — that is the server's job (S21).
- **No replay scrub controller.** Variable-speed replay over ADR-002 replay artifacts is a real future state machine; it is out of scope here, and the cache design must not preclude it.

**Still open:** settings-store mechanism (plain module + `useSyncExternalStore` vs context vs a small library — D11 and rule 9 hold either way); whether entitlement-driven refresh cadence lands with the first slice or waits for ADR-004 auth; React Router vs TanStack Router (unchanged by this ADR — see ADR-003).

### ADR-015 — API versioning & compatibility (accepted)

**Decision:** Four parts, which interlock:

1. **URL path versioning** — every BT API route is `/api/v{n}/…`, starting at **v1**, from the first commit that touches the boundary.
2. **Additive-only within a version** — inside `v1`, add fields/routes/optional params; never remove, rename, retype, or re-mean an existing one.
3. **OpenAPI generated from the route contract** — the [ADR-014](#adr-014--client-state-management-accepted) TypeScript route table is the source; the spec is a **derived artifact**, committed so it can be diffed.
4. **`oasdiff` as a CI gate** — a backward-incompatible diff against the committed baseline fails the build. Bumping to a new version is the sanctioned way to make one.

#### Why versioning *and* additive-only (they are not redundant)

The gate in (4) blocks breaking changes to v1. A gate with no legal exit is a gate that eventually gets disabled, so (1) is that exit: a breaking change is still possible, it just has to announce itself as `/api/v2` while v1 keeps answering. Additive-only is the discipline for ~all day-to-day change; versioning is the rarely-used escape hatch that keeps the discipline honest instead of aspirational.

Additive-only cannot stand alone because some changes are not expressible additively: removing a field that should not have shipped, renaming when the model was wrong, `string` → `number` or nullable → non-nullable, deleting a route, or **changing the meaning of a field while keeping its shape** (which no schema diff can catch). Without an escape hatch each of those is either "never fix it" or "break clients today," and payloads accumulate `plays`, `plays2`, `playsV2Correct` until the response is archaeology.

**Why the prefix ships now, before any second version exists:** versioning cannot be retrofitted without breaking. Once clients call `/api/schedule`, introducing `/api/v1/schedule` *is* a breaking change, and the unversioned path has to live forever as a de facto alias. One path segment today buys the option permanently.

#### What counts as breaking

| Breaking (needs a new version) | Additive (safe within a version) |
|--------------------------------|----------------------------------|
| Removing or renaming a response field or route | Adding a response field |
| Narrowing a type, or nullable → non-nullable | Widening a union, adding an enum member |
| Adding a **required** request parameter | Adding an optional request parameter |
| Changing status codes or error codes for existing conditions | Adding a new route or a new error code for a new condition |
| **Changing the meaning** of an existing field | Documentation, examples, ordering |

The last breaking row is the one tooling cannot detect. It is a review responsibility, called out here so nobody assumes a green `oasdiff` means "not breaking."

#### Client version pinning and deploy skew

Clients pin the version they were built against (the version lives in the route table, so it is compile-time, not a runtime string). Note **which mechanism actually protects a stale client**: additive-only. A browser holding old JS keeps working against a newer v1 server because it ignores fields it does not read — and that is genuinely safe here only because ADR-014 chose **not** to runtime-validate, making the client a tolerant reader by construction.

Versioning only matters at **sunset**. When a version is retired, the backstop is: `Deprecation` and `Sunset` response headers while it is winding down, per-version request logging so retirement is evidence-based rather than hopeful, and **HTTP 426 Upgrade Required** once it is gone, which the SPA turns into the "new version available — reload" affordance already carried in [FEATURES](./FEATURES.md) as *Update / changelist UX*.

#### Tooling

| Job | Tool | Note |
|-----|------|------|
| Response schemas from TS types | **`ts-json-schema-generator`** | Actively maintained; works on plain exported types, so it does not dictate domain shapes. `typescript-json-schema` is in maintenance mode and defers to it |
| Assemble paths/operations | Small in-repo emitter | Walks the route table, `$ref`s the generated schemas |
| Breaking-change gate | **`oasdiff`** (`--fail-on ERR`) | Industry default: hundreds of checks, stable change IDs, severities, CLI + GitHub Action; an npm wrapper (`oasdiff-js`) exists for a pnpm repo |

**Rejected:** `ts-oas` — it emits OpenAPI directly but "requires interfaces/types in a specific format," which would let the spec tool dictate the shape of BT product domain types. Backwards.

**Consequence:**

- The ADR-014 route contract must be a **runtime-enumerable table** (`as const`), not only a type, because the emitter walks it. Response types stay bound through a `keyof`-constrained registry, so routes are still statically enforced rather than stringly-keyed.
- The committed spec is a **generated artifact under CI check** — regenerating must be part of the change, and a stale spec fails the build.
- The Hosting rewrite needs no change: `{ "source": "/api/**", "function": "api" }` already covers versioned paths.
- Deleting a version is a deliberate, logged, header-announced event — not a cleanup commit.

**Non-goals:**

- **Date-based version pinning** (Stripe/Shopify style). The gold standard at scale, but it carries a transformer-chain engineering tax that a first-party SPA cannot justify.
- **Header / media-type versioning.** More RESTful, but it breaks the URL-as-cache-key property that Hosting's cacheable GETs want, needs `Vary` discipline, and is undebuggable from a single curl line.
- **Query-param versioning** — an anti-pattern for permanent versioning.
- **Per-field versioning**, runtime response validation (ADR-014), and **multi-version mounting** until a v2 actually exists.

**Still open:** sunset window length once there is a public deploy; where the spec is published (repo artifact only vs a docs surface); whether `oasdiff` runs as the GitHub Action or the npm wrapper.

---

### ADR-016 — Generated client DAL from the OpenAPI spec (accepted)

**Decision:** The web client's data access layer is **generated from the committed OpenAPI spec**, not hand-written against the TypeScript route table. Tooling is `openapi-typescript` (types) plus `openapi-fetch` (a small typed fetch wrapper).

#### Why this changes the ingress rule from ADR-014

[ADR-014](#adr-014--client-state-management-accepted) said data is typed up to egress and typed again on ingress **from one declaration** — the TS route table, imported directly by both ends. [ADR-015](#adr-015--api-versioning--compatibility-accepted) then made the OpenAPI spec a *derived* artifact: committed, diffed by `oasdiff`, and consumed by **nothing**.

That last part is the problem. `oasdiff` compares the spec against its own previous self; it never compares the spec against reality. So if the emitter under-specifies a route — drops a field, gets nullability wrong, widens a union — the spec is quietly wrong, the gate stays green forever, and the error only surfaces when some future non-TS consumer trusts it.

Generating the client from the spec closes that loop. The spec stops being write-only documentation and becomes load-bearing: an under-specified spec now fails the client's typecheck, in CI, on the commit that introduced it.

#### The round-trip, and what it costs

The full path is: TS route table → JSON Schema → OpenAPI → generated TS client types. Every hop can lose fidelity. Unions may widen, branded and template-literal types flatten toward `string`, and `optional` versus `nullable` can blur.

**Guard:** a type-level assertion, checked in CI, that for every route in the table the generated response type and the `@bt/domain` type are **mutually assignable**. If a hop loses fidelity, that assertion fails at build time rather than the loss being discovered at runtime. This guard is the reason the round-trip is acceptable; without it, this ADR would be trading a real property for a nominal one.

**Honest accounting of what this buys.** Client and server here are one pnpm monorepo that already share `@bt/domain`, so this does not buy cross-language reuse — the usual reason to generate from a spec. It buys exactly one thing: proof that the spec is faithful. That is worth it because ADR-015 already committed to publishing and gating the spec; an unverified gate is worse than no gate, because it is trusted.

**Consequence:**

- ADR-014's "one declaration" becomes **one source, two hops**: the route table is still the origin, but ingress types arrive via the generated client.
- Generated output is committed, carries an `@generated` banner, and is **never hand-edited**. Regenerating must produce no diff, enforced in CI.
- [S25](./BACKLOG.md)'s query descriptors derive payload types from the generated client rather than importing `@bt/domain` directly.
- The tolerant-reader stance ADR-015 depends on is preserved: `openapi-fetch` performs **no runtime validation**.

**Rejected:**

- **Orval** — generates TanStack Query hooks per route, which would overlap and largely gut S25's ownership of the cache layer. The cache policy is a BT decision, not a codegen output.
- **openapi-generator** — the official generator, but it pulls a Java toolchain into a pnpm/Node repo and emits a large, hand-unfriendly client.
- **Generating the server from the spec.** The server stays TypeScript-first; the route table remains the origin. Inverting that would make the spec dictate BT domain shapes, which ADR-015 already rejected when it ruled out `ts-oas`.

**Non-goals:** runtime response validation (still rejected, per ADR-014); generating query hooks; publishing the spec to an external docs surface.

**Still open:** whether a future non-TS consumer ever justifies publishing the spec beyond a repo artifact.

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

## BT store shapes

Ingest does not hand the UI an upstream tree. Each fetched `GameSnapshot` is
projected (`projectGame` in `packages/domain/src/projections.ts`, pure) into
five BT-owned documents declared in `packages/domain/src/store.ts`, and written
through `GameProjectionRepository` (`functions/src/services/projection-store.ts`;
memory adapter today, Firestore at S7).

| Document | Type | Carries |
|----------|------|---------|
| Game header | `GameHeaderDoc` | gamePk, dates, status, teams, venue |
| Linescore | `GameLinescoreDoc` | `LinescoreSummary` — innings, count, outs |
| Plays | `GamePlaysDoc` | the `AtBat[]` list plus `playCount` |
| Boxscore | `GameBoxscoreDoc` | per-team `BoxscoreTeamTable` (`BoxscoreBattingRow` / `BoxscorePitchingRow`) |
| Media | `GameMediaDoc` | `MediaHighlight[]` when content is present |

`GameProjection` is the five together. Every document extends
`GameDocumentMeta`, so each carries `gamePk`, `fetchedAt`, and `windowMode` on
its own — a reader can refresh the linescore of a live game without refetching
its play-by-play, and a live patch rewrites one document rather than the game.

Boxscore rows are derived from the at-bats until the MLB client fetches upstream
boxscore lines (S13); the shape does not change when that source arrives.

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
2. ~~Client sync: **poll Functions API**, **Firestore listeners**, or hybrid?~~ → **Narrowed** by [ADR-014](#adr-014--client-state-management-accepted): clients read BT over HTTP, and **BT-mediated push and poll both write the one server read cache** — never direct Firestore listeners on hot game docs. Still open within that: which transport a watched game uses (SSE vs WebSocket vs short-poll) and the cadence values.
3. Historical highlight index (v2 ES) vs live MLB GraphQL search?
4. **Patreon** OAuth link + webhook/refresh + patron migration UX (auth methods locked: magic link + passkeys; Patreon ≠ login)
5. AI provider(s) when enrichment ships; heuristic vs model for first impact-sort
6. Crosswalk seed + refresh when Phase 1 deep links ship
7. ~~**Scaffold repo**~~ → done (pnpm monorepo + local API + Vite SPA)
8. Cutover mechanics when ready (dns, beta, flags)
9. Any client→MLB direct path (e.g. GraphQL search CORS)?

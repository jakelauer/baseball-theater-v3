# Baseball Theater v3 — Features

**Status:** Drafting (goals in place)  
**Depends on:** [INTENT.md](./INTENT.md) (especially **Goals G1–G5**)  
**v2 reference (menu only):** [`../v2/FEATURES.md`](../v2/FEATURES.md)

This document defines **what users get** in v3. It does not describe frameworks, repos, or deploy targets.

---

## North star

> Baseball Theater is where fans go for **highlights, live game context, and insight you can’t get from a raw MLB feed**—analysis, summarization, and richer tools—run efficiently and funded by supporters (Patreon), without using Patreon as your login.

(Trace: G2, G3, G4, G5; cost/efficiency is G1 / platform.)

---

## Principles (product)

_Edit as we agree._

1. **Highlights and game understanding first** — video + context beat generic scoreboard clones.
2. **Above the baseline** — MLB (and similar) data is an input; **differentiation** comes from other sources, derived analysis, and AI (G2, G4).
3. **Opinionated, not exhaustive** — prefer a sharp, robust experience over mirroring every MLB.com surface (G5 ≠ “clone everything”).
4. **Supporters unlock depth** — patronage should feel like power, not a paywall on the homepage; **pay via Patreon, sign in via BT auth** (G3).
5. **New capabilities are first-class** — v3 exists to grow the product; legacy parity is optional (G5).
6. **Honest about data** — we don’t pretend to be MLB or offer broadcast streams we don’t have.
7. **Live schedule/game UX is BT-backed** — freshness comes from Baseball Theater’s data layer around game time (see [ARCHITECTURE §1](./ARCHITECTURE.md#1-foundational-data-topology-accepted-direction)).
8. **AI is visible product value** — analysis, stats commentary, and summaries should show up in the UX, not only as internal tooling (G4).

---

## Scope legend

| Tag | Meaning |
|-----|---------|
| **MVP** | Ships in first public v3 |
| **v3** | In scope for the rearchitecture era, not necessarily day one |
| **Later** | Explicitly deferred |
| **Drop** | Will not bring from v2 / will not build |
| **New** | Did not exist (or only stubbed) in v2 |

---

## Carry / cut from v2 (working table)

**Decision (accepted):** Carry the v2 product loop except the explicit drops below. Carried surfaces may still be redesigned (BT-backed data, new auth, AI, etc.).

| v2 capability | Verdict | Notes |
|---------------|---------|-------|
| ApiTest / swagger explorer | **Carry** | Can be internal/dev-only |
| Daily scoreboard by date | **Carry** | BT-backed (ADR-002) |
| Game → Box score | **Carry** | |
| Game → Editorial recap | **Carry** | May coexist with **AI summaries** (New) |
| Game → Live play / linescore context | **Carry** | |
| Game → Plays + pitch detail | **Carry** | Natural home for AI/analysis later |
| Game → Videos / highlights | **Carry** | |
| Highlight search (date + tag) | **Carry** | Scoreboard day-tag shortcuts can remain; not the Featured Videos area |
| Highlight search (free-text) | **Carry** | |
| Savant deep links (delayed, gated) | **Carry** → **expand** | Phase 1 multi-source links; Phase 3+ Savant video/statcast inline (see Multi-source knowledge) |
| Settings (favorites, hide scores, playback prefs) | **Carry** | Favorites still useful for scoreboard sort without team pages |
| Settings sync for patrons | **Carry** | Via **new** accounts (G3), not Patreon OAuth |
| Standings | **Carry** | |
| Update / changelist UX | **Carry** | Mechanism may change without a SW/PWA |
| Chromecast | **Drop** | |
| Featured / tagged video feeds | **Drop** | `/videos/...` browse experience |
| Public playback-style catalog APIs | **Drop** | `/api/team`, compilations, recaps, singleplays, nonplays-style catalog |
| PWA / installability | **Drop (MVP)** | **Accepted:** responsive web only for now. No service worker / Workbox / install manifest at launch. **Push notifications** are a separate **Later** feature (FCM + minimal SW)—not blocked by this decision. Full PWA can be retrofitted via `vite-plugin-pwa` if desired. |
| Reddit / no-hitter bot | **Drop** | |
| Schedule route (unwired in v2) | **Drop** | Do not build the `/schedule/...` surface |
| Team pages (highlights + schedule) | **Drop** | Entire `/team/...` area |
| Patreon login + tier gates | **Replace** | Login ≠ Patreon; **payments/tiers still Patreon-driven** (G3) |

### Dropped (summary)

Featured/tagged video feeds · Team pages · Chromecast · PWA · Public playback catalog APIs · No-hitter bot · Schedule route

---

## New product themes

Themes map to goals. Detail below as they firm up.

| Theme | One-line idea | Goals | Priority |
|-------|---------------|-------|----------|
| **Derived insight** | Layers on top of MLB: external sources + our analysis | G2, G5 | High |
| **Multi-source knowledge** | Link to—and eventually aggregate—MLB, FanGraphs, BBRef, Savant, etc. | G2, G4, G5 | High |
| **AI game companion** | Analysis, summarization, and **intelligent curation** (impact-ranked videos, day’s best across the league) | G4, G5 | High |
| **Impact curation** | Rank what most people would want to see—per game and league-wide for a day | G2, G4, G5 | High |
| **Inning / game insight pipeline** | End-of-inning live feed + finished **game package** feeding day digests | G2, G4, G5 | High |
| **Modern membership** | BT accounts + entitlements; Patreon continues to collect support | G3 | High |
| **Robust core** | Deeper, more reliable scoreboard → game → video/search loop than v2 | G5 | High |
| **Efficient platform** | User-visible reliability/perf from serverless + owned data (not a feature page) | G1 | Platform |
| **Push notifications** | Game start/end, highlights, smart score digests (favorite teams) | G5 | **Later** (post-MVP; FCM, not full PWA) |

### Theme detail

#### Derived insight (G2)

- **Intent:** Show fans something that isn’t “the same JSON MLB already shows,” via other datasets and/or BT-computed analysis.
- **Examples (brainstorm, not committed):** Savant/Statcast-style context, pitch quality framing, win-probability style narratives, cross-source linking, day/season digests.
- **Non-goals (initial):** Replacing MLB.TV; claiming official stats authority.

#### Multi-source knowledge (G2, G4)

**Problem today:** MLB Stats API is the spine—we get `playerId`, `teamId`, `gamePk`, etc. Fans live on **mlb.com**, **FanGraphs**, **Baseball-Reference**, and **Baseball Savant**, each with different IDs, URL shapes, and unique metrics (bWAR, fWAR, Statcast, Savant video, etc.). v2 only deep-linked Savant in a few gated places; there is no general cross-site story.

**Intent:** Build a path from “we only know MLB” to “we understand the baseball data ecosystem” — first as **links**, later as **selected aggregation**, eventually with **agent-assisted** fetch/normalize/explain.

**Phased product (extent TBD — ship incrementally):**

| Phase | User value | Example |
|-------|------------|---------|
| **1 — Deep links** | One tap to the same player/game on another site | Player name → MLB · FanGraphs · BBRef · Savant profile URLs |
| **2 — Understand sources** | BT knows what each site *is good for* | UI copy / tooltips; “fWAR lives on FanGraphs”; agent can cite where a stat came from |
| **3 — Cached snapshots** | Show a few **foreign** metrics inline without leaving BT | e.g. season bWAR + fWAR next to a box score line; Statcast EV/LA on a play when Savant has it |
| **4 — Agent aggregation** | On-demand or scheduled **multi-source** answers | “Compare these two pitchers’ stuff+plate discipline across sources”; summarize a game using BT game doc + external pulls |

**Simplest must-have (likely early):** Phase 1 for **players** (and eventually teams/games where mappings exist). This alone is high value and bounded scope.

**Complex stretch (later):** Phase 3–4 — unique metrics and Savant video/play data merged into game/player context; requires ingestion policy, caching, cost, and legal/ToS care (see architecture §3).

**Relationship to other themes:** Feeds **AI game companion** (grounding + tools); overlaps **Derived insight** but is specifically about **external sites as first-class citizens**, not only BT-computed stats.

**Non-goals (initial):** Becoming a full FanGraphs/BBRef mirror; scraping entire sites; user-triggered open relay to arbitrary URLs (v2 anti-pattern).

#### AI game companion (G4)

- **Intent:** In-product AI for **game analysis**, **statistical analysis**, **summarization**, Q&A, and related help—grounded on BT-owned game data plus multi-source tools (ADR-009).
- **Surfaces (brainstorm):** per-game recap alternate to/alongside editorial wrap; play/inning explainers; Q&A over a game BT already stores.
- **Constraints to design later:** cost per user, grounding rules, entitlement tiering, latency vs cadence windows.
- **Feeds / shares pipeline with:** [Impact curation](#impact-curation-g2-g4-g5) (same agent/data plane; curation is the first high-visibility application).

#### Impact curation (G2, G4, G5)

**Problem today:** Game highlight lists are mostly **MLB’s order** (or chronological / tag-based). Fans often want “show me the stuff that **mattered**” or “what was **interesting** today across baseball?”—not twenty equally weighted clips.

**Intent:** Use BT’s owned game/play/media state (and later multi-source signals) so an **AI / ranking layer** can:

1. **Per game — impact-sort videos** — Order (or tier) highlights by how **impactful** they are to the game outcome and narrative—what most people would want to watch first (go-ahead HR, walk-off, huge defensive play that saved runs, etc.), not only “first clip in the feed.”
2. **Per game — interesting besides impact** — Surface clips/plays that are **notable** even if low leverage (bizarre play, milestone, filthy pitch, Statcast outlier).
3. **League-day digest** — Across **all games on a date**, surface the most interesting **videos**, **plays**, **stats**, and **accomplishments** (e.g. cycle, no-hitter progress, career firsts, league-leading performances that day).

**Ideal end state:** One intelligent consumer (agent / ranking pipeline) that can **read all approved data sources** BT has (live feed, media items, Savant/cross-source snapshots when available) and **derive** these rankings and digests—not a pile of one-off hardcoded sort rules forever (rules may bootstrap Phase A).

**User-facing surfaces (brainstorm):**

| Surface | Where it shows up |
|---------|-------------------|
| “Watch these first” / impact-ordered Videos tab | Game → Highlights |
| “Also interesting” rail | Same game, secondary list or badges |
| “Best of [date]” / league digest | Scoreboard day, or dedicated day digest (replaces some of the dropped Featured Videos *browse* with something smarter) |
| Digests feeding search / home | Optional later |

**Phased approach (extent TBD):**

| Phase | Behavior | Inputs (typical) |
|-------|----------|------------------|
| **A — Heuristic rank** | Deterministic score from play context (leverage / score change / inning / event type) + media keywords; sort videos | BT live feed + media metadata only |
| **B — Model-assisted rank** | LLM or classifier re-ranks / labels using structured play+clip features; caches result per `gamePk` | Same + optional Statcast |
| **C — League-day digest** | After (or near) day’s games settle, produce ranked slate of videos / plays / stats / accomplishments | All day’s BT game docs + media |
| **D — Multi-source enrich** | Digests/ranks incorporate foreign signals (Savant rarity, WAR context, etc.) | ADR-009 Phase 3+ |

**Non-goals (initial):** Replacing MLB’s own editorial recap feed wholesale; claiming “official” highlight priority; ranking that requires per-viewer personalization on day one (global “most people would want” is enough).

**Relationship to dropped Featured Videos:** v2’s tag-browse area is **dropped**; Impact curation is the **replacement philosophy**—curated “what mattered” instead of static tag grids.

**Feeds from:** [Inning / game insight pipeline](#inning--game-insight-pipeline-g2-g4-g5) — day digests should prefer finished **game packages**, not raw MLB dumps.

#### Inning / game insight pipeline (G2, G4, G5)

**Intent:** A server-side consumer runs on a **game clock** (not a user click):

1. **End of every inning** (every in-window game) — Read current game statistics / play state from BT’s store and emit **in-game insight items**: interesting snippets, notable stats, things to note. These form a **live feed** users can follow during the game (and afterward as a timeline).
2. **Game final** — Produce a finished **game package**: durable summary of what mattered (impactful plays/videos, standout lines, accomplishments, narrative beats). This package is the **canonical input** for league-day digests and other postgame surfaces.
3. **Day rollup** — Per-day producers **reference game packages** (plus any still-live inning feeds if needed), rather than re-scanning every raw play from scratch.

```text
Inning N ends  →  insight items → live “in-game feed”
     … 
Game final     →  game package  →  day digest / Best of [date]
                                    impact video order (can refine here too)
```

**User-facing (brainstorm):**

| Surface | Content |
|---------|---------|
| Game → live insight / “notes” feed | Append-only cards as innings complete |
| Game → postgame package view | One-shot “what mattered” after final |
| Scoreboard / Best of day | Built from packages, not only raw highlights |

**Why this shape**

- **Bounded AI cost** — ~9–12 insight passes per game + 1 package, not per user or per pitch
- **Natural cadence** — aligns with baseball structure; easier than guessing “every 30s re-summarize”
- **Composable** — day/league features stand on packages; live UX stands on inning feed
- Works with heuristic first, model later (same as impact curation phases)

**Relationship to ADR-002:** Detection of “inning ended” / “game final” comes from BT’s ingested live state (cadence polls). Insight jobs are **triggered by state transitions**, not by inventing a second MLB poller.

**Non-goals (initial):** Pitch-by-pitch AI commentary; personalizing the feed per user on day one.

#### Push notifications (Later)

- **Intent:** Notify fans about games they care about—driven by **server-side** ingest transitions (ADR-002), not client polling.
- **Examples (phased):** game start / final for favorite teams; new highlight on a followed game; **smart** score updates (inning digest, lead change, close game)—not every run.
- **Stack:** Firebase **Cloud Messaging** + minimal `firebase-messaging-sw.js`; optional `manifest.json` for iOS home-screen install when push ships.
- **Not required:** v2-style Workbox precache, offline shell, or full PWA (can retrofit later without MVP rework).
- **Relationship:** Ingest should emit transition events early (also feeds inning feed / game package); user `notifyPrefs` + `fcmTokens` on account doc.
- **Non-goals (MVP):** Any push UI, service worker, or notification permission prompts.

#### Modern membership (G3)

- **Intent:** Users **authenticate with Baseball Theater** via **Firebase Auth** — **email magic link** and **passkeys** (ADR-004). **Paying / membership status** continues to flow from **Patreon**.
- **User-visible:** Sign in with magic link or passkey; optionally **Connect Patreon** (OAuth) to unlock supporter tiers. Manage pledges on Patreon; BT maps pledge → entitlements.
- **Replace:** v2 “Log in with Patreon” as the **session** IdP. Patreon OAuth remains only as **account linking** for tier.
- **Entitlements:** Carry v2 free/patron gates for carried features (see [Patronage](#patronage--access-product-level)).

#### Robust core (G5)

- **Intent:** Broader, sturdier product than v2—not only AI bolted onto a thin scoreboard.
- **From v2:** Carry scoreboard → game tabs → search → standings → settings (see carry/cut table); drop featured videos, teams, Cast, PWA, playback APIs, bot, schedule.
- **Still TBD:** concrete MVP checklist and how AI/insight land inside carried surfaces.

---

## Build checklist (working — not a “feel” gate)

v3 is a **rewrite**, not a port. Ship carried surfaces + platform; new themes when ready. No separate “must feel like v3” bar.

- [ ] Core carried loop: **scoreboard → game (videos / live / plays / box / recap) → search → standings → settings**
- [ ] BT-backed schedule/game data (ADR-002)
- [ ] Firebase Auth (magic link + passkeys) + Patreon entitlements (G3)
- [ ] Firebase / serverless cost shape (G1)
- [ ] New themes (deep links, impact sort, inning feed, …) — **when chosen**, not blockers

**Explicitly out of product (dropped)**

- Featured/tagged video feeds, team pages, Chromecast, PWA (MVP), public playback catalog APIs, no-hitter bot, schedule route

---

## Patronage & access (product-level)

**Decision (accepted):** Keep **v2 entitlement shape**, minus gates tied to **dropped** features. Payments stay Patreon; login is Firebase (magic link + passkeys). **Server-enforced** (unlike v2’s client-only checks).

| Aspect | Direction |
|--------|-----------|
| **Payments / pledges** | Remain **Patreon** (G3) |
| **Login / session** | **Firebase Auth** — email **magic link** + **passkeys** only (ADR-004) |
| **Patreon connection** | **OAuth as linked account** (after BT login) so BT can read **subscription tier** — **not** an auth method |
| **Entitlements** | Linked Patreon pledge/tier → BT user; enforced on server |
| **Free vs paid** | Same relative split as v2 for **carried** surfaces |

### Tiers (carry from v2)

`Backer` → `Pro Backer` → `Star Backer` → `Premium Sponsor` (cumulative; owner/admin bypass)

| Capability | Minimum (v2) | v3 |
|------------|--------------|-----|
| Faster live refresh | Backer | **Carry** (interval TBD) |
| Cloud-synced settings | Backer | **Carry** |
| Savant play/pitch video links (+ delay) | Pro Backer | **Carry** (expand to multi-source links per ADR-009) |
| Chromecast | Pro Backer | **Drop** (feature dropped) |
| Team pages / team APIs | Star / Pro | **Drop** (feature dropped) |

New gated surfaces (AI depth, push, play theater, etc.) get tiers when those features ship — not a pre-build decision.

---

## Success signals

| Signal | Goals | Target / note |
|--------|-------|----------------|
| Infra / hosting cost vs v2 EB | G1 | Lower steady-state cost; _quant TBD_ |
| Differentiation users notice | G2, G4 | Insight/AI surfaces used, not just visited |
| Auth conversion / support friction | G3 | Can pay on Patreon and use BT login without Patreon-as-IdP pain |
| Breadth of weekly-active surfaces | G5 | More than scoreboard + one game tab |

---

## Open product questions

_Owner decides when ready — none of these block scaffolding or the carried rewrite._

1. Cutover timing/shape (hard cutover vs beta vs new host) — when ready
2. Which new theme to build first (deep links, impact sort, inning feed, play theater, …) — when ready
3. ~~Patreon link~~ → **OAuth linked account** after BT login (ADR-004); migration UX for existing patrons still TBD
4. ~~PWA~~ → **Drop for now**; push **Later** (see [Push notifications](#push-notifications-later))

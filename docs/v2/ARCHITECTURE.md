# Baseball Theater v2 — Architecture

Source of truth: `/Users/jakelauer/Repos/BaseballTheater` (npm package name `baseball-theater-v2`).

This document describes **how the system is structured**, data flows, dependencies, and deploy topology. Product behavior is covered in [FEATURES.md](./FEATURES.md).

---

## 1. Foundational data-fetch model (read this first)

**Almost all MLB game/media data is requested by the user’s browser**, not pre-aggregated or served from Baseball Theater’s own database of live scores. The SPA decides *what* to fetch (scoreboard for a date, live feed for a `gamePk`, etc.); the Express app mostly **relays** those requests.

### Why a proxy exists

Browsers cannot freely call `statsapi.mlb.com` / related MLB REST endpoints from `baseball.theater` because of **CORS**. The client therefore never talks to those hosts directly for Stats-API-style JSON. Instead:

```text
User browser  →  GET https://baseball.theater/api/proxy?url=<mlb-url>
              →  Baseball Theater server fetches <mlb-url>
              →  JSON returned to the browser (same-origin)
```

`MlbClientDataFetcher` rewrites every `MlbDataServer` URL through that pattern. Secondary benefit: the proxy responses are cached briefly with **apicache (~30s)**.

### Consequence for upstream APIs (critical for v3 planning)

From MLB’s (and any proxied host’s) point of view, **traffic does not look like N independent user IPs**. It looks like traffic from **the small set of Baseball Theater server egress IPs** (Elastic Beanstalk / VPC outbound). Every concurrent viewer’s scoreboard polls, live-game refreshes, standings loads, etc. are funneled through that shared origin.

Implications of this starting point:

| Aspect | Reality in v2 |
|--------|----------------|
| Who initiates fetches | The **browser** (per user session / poll interval) |
| Who appears as client to MLB REST | The **BBT server(s)** |
| Scaling shape | User count × poll rate ≈ load on **shared egress**, not distributed client egress |
| Rate limits / blocking risk | Concentrated on BT infrastructure IPs |
| Caching | Helps somewhat (30s apicache on `/api/proxy`), but live polls still amplify |
| Server role for core UX | Thin **CORS-avoidance + cache** relay, not a domain API that owns the data |

### What does *not* go through `/api/proxy`

| Path | How it reaches upstream |
|------|-------------------------|
| Video **search** (Relay) | Browser → **directly** to `fastball-gateway.mlb.com/graphql` (MLB allows this CORS path) |
| `/api/team`, compilations, recaps, etc. | Browser → BT server → server-side `MlbDataServer` Node fetch to mlb.com data-service (still BT egress, but a dedicated endpoint rather than open proxy) |
| `/api/search` | Browser → BT → Elasticsearch (BT-owned index, not live MLB) |
| `/auth/*`, settings | Browser → BT → Patreon / DynamoDB |
| Actual **video file** playback | Browser (or Chromecast) loads MP4/CDN URLs from media payloads — not via `/api/proxy` |

So: **Stats API / schedule / live / standings / game content JSON ≈ browser-driven via shared proxy egress.** GraphQL search is the main first-party MLB exception that leaves the user’s browser as the direct client.

---

## 2. System overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser SPA (CRA / React 18)                                    │
│  MOST MLB JSON: MlbClientDataFetcher → /api/proxy → MLB REST    │
│       (browser initiates; SERVER egress is what MLB sees)       │
│  Relay ──► MLB Fastball GraphQL (direct from browser)           │
│  Auth/Settings ──► /auth/*                                      │
│  Team highlights ──► /api/team (server then calls MLB)          │
│  Cast SDK / PWA / GA / Sentry                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│ Express server (TypeScript → webpack’d for EB)                  │
│  /api/proxy = open JSON relay (CORS bypass + 30s cache)         │
│  Playback APIs → MlbDataServer (Node) → mlb.com data-service    │
│  /api/search → AWS Elasticsearch (highlights-index)             │
│  /auth/* → Patreon OAuth + DynamoDB bbt-patrons                 │
│  Static SPA in production + catch-all index.html                │
└───────┬─────────────────┬──────────────────┬────────────────────┘
        │                 │                  │
   DynamoDB          Elasticsearch      (unused Mongo URL)
   bbt-patrons       highlights-index   in keys.json
   bbt-highlights    (+ S3 highlights
                     loader disabled)

Shared library: baseball-theater-engine (types + MlbDataServer)
Deploy: zip → AWS Elastic Beanstalk (beta / prod hosts)
Workers/: orphaned Reddit checkers (not started by server)
```

**Hosts**

| Env | Host |
|-----|------|
| local | `http://jlauer.local:8000` (API); CRA often on `:3000` |
| beta | `https://beta.baseball.theater` |
| prod | `https://baseball.theater` |

---

## 3. Repository layout

| Path | Role |
|------|------|
| `client/` | React SPA (`bbt2`), CRA 5 + react-app-rewired |
| `server/` | Express app source, auth, playback, search, config, build scripts |
| `baseball-theater-engine/` | Shared TypeScript contracts + `MlbDataServer`; consumed from `dist/` |
| `workers/` | Game/no-hitter Reddit bot libraries (unwired) |
| `builds/` | Timestamped EB zip artifacts |
| `.ebextensions/` | Beanstalk security-group egress |
| `.platform/nginx/` | Nginx connection / WebSocket tweaks (**not copied** by current `finalize_v2`) |
| Root `package.json` | Orchestrates pnpm install, concurrent dev, client+server build |

Package manager is **pnpm** (`only-allow pnpm` preinstall).

---

## 4. Client architecture

### 4.1 Stack

| Concern | Choice |
|---------|--------|
| UI | React 18.2, mix of class + function components |
| Routing | react-router-dom 6.3, lazy areas via `React.Suspense` |
| Component library | Material UI v4 (+ lab, pickers), SCSS modules, some styled-components |
| GraphQL | Relay 11 → `https://fastball-gateway.mlb.com/graphql` |
| MLB REST | `baseball-theater-engine` `MlbDataServer` subclass with URL proxy |
| App state | Custom pub/sub **DataStore** classes (not Redux) |
| Dates | moment / moment-timezone |
| Build | `react-scripts` 5 + Relay babel plugin via rewired config |
| Dev proxy | `"proxy": "http://jlauer.local:8000"` |

### 4.2 Application composition

```
index.tsx
  └─ BrowserRouter
       └─ MuiThemeProvider
            └─ App
                 ├─ RelayEnvironmentProvider
                 ├─ Sidebar / SidebarDrawer
                 ├─ RouteContainer (lazy Areas)
                 ├─ Upsell modal
                 └─ UpdateAvailableDialog (SW + changelist)
```

### 4.3 Routing

Path helpers: `client/src/Global/Routes/Routes.ts` (`SiteRoutes`).  
Registration: `client/src/App/Routes.tsx`.

Wired areas: Games, Game, Standings, FeaturedVideos, Teams, Settings, Search, ApiTest.

Defined but **unregistered:** `SiteRoutes.Schedule` (`/schedule/:year/:team?`).

Game tabs type: `"Wrap" | "LiveGame" | "BoxScore" | "Highlights" | "Plays"`.

### 4.4 DataStores (client state)

| Store | Responsibility |
|-------|----------------|
| `AuthDataStore` | Session from `/auth/status`; level hierarchy helpers |
| `SettingsDataStore` | Preferences; localStorage or `/auth/get-settings` + `save-settings` |
| `GameDataStore` | Per-game live feed + media polling; context for game tabs |
| `RespondDataStore` | Breakpoint / responsive mode |
| `UpsellDataStore` | Patron upsell modal |
| `ChromecastDataStore` | Cast availability |

### 4.5 MLB data access from the browser

See **§1** for the full proxy / shared-egress model. Implementation detail:

`MlbClientDataFetcher` extends `MlbDataServer` and rewrites every upstream URL:

```text
original MLB URL → /api/proxy/?url={encodeURIComponent(original)}
```

The browser remains the orchestrator (when to poll, which `gamePk`, which date). The server does not push live data; it only relays and briefly caches.

**Parallel path:** Relay posts GraphQL **directly** to MLB Fastball (not through the Express proxy)—so search traffic *does* egress from individual user networks to MLB, unlike Stats API traffic.

### 4.6 Area → data sources

| Area | Primary data |
|------|----------------|
| Games | `getScoreboard(date)` via proxy |
| Game | `getLiveGame`, `getGameMedia`; fallback `videoLocalSearch` → `/api/search`; GraphQL searcher |
| Search | Relay `NewSearchQuery` → Fastball |
| FeaturedVideos | `videoTagSearch(tag)` via proxy |
| Standings | `getStandings` via proxy |
| Teams schedule | `getTeamSchedule` via proxy |
| Teams highlights | `GET /api/team` |
| Settings / Auth | `/auth/*` |
| ApiTest | static swagger JSON |

### 4.7 PWA

- `serviceWorkerRegistration.register()` in production
- Workbox precache + navigate fallback to `index.html`
- Navigate blacklist includes `/auth`, `/api`, `/_`, dotted paths
- Manifest: standalone, theme `#ce0f0f`, start `/games`

### 4.8 Cross-cutting client services

- Google Analytics `UA-23730353-4`
- Sentry browser SDK
- react-helmet titles
- ErrorBoundary email deep-link
- `localStorage["visits"]` counter

---

## 5. Server architecture

### 5.1 Entry & middleware

**File:** `server/server.ts`

1. Express app on `process.env.PORT || 8000` (webpack may bake `__PORT__` for packaged builds)
2. Production: `express.static(clientFolder)` with cacheControl
3. `compression()`, `cookie-parser()`, JSON / urlencoded body parsers
4. `RegisterPlaybackEndpoints` then `RegisterLocalEndpoints`
5. SPA `GET *` → `index.html`
6. Boot: `Search.initialize()`, `Auth.initialize()`, `Database.initialize()`
7. `server.setTimeout(10000)`

**Absent:** CORS middleware, global error handler, request logging middleware.

`apicache` is applied **per route**, not globally.

### 5.2 HTTP surface (exhaustive)

#### Playback (`server/Playback/endpoints.ts`)

All intended to require `x-app` + `x-api-key` matching `server/apikeys.json`, but **`apiKeyRequiredEnabled = false`** so failures are ignored today. Cache: **1 minute**.

| Method | Path | Upstream |
|--------|------|----------|
| GET | `/api/team` | MLB tag search `teamid-{TeamId}` |
| GET | `/api/compilations` | playlist search |
| GET | `/api/recaps` | tag search (`RecapTags`) |
| GET | `/api/singleplays` | tag search (`SinglePlayTags`) |
| GET | `/api/nonplays` | tag search (`NonPlayTags`) |

Pagination walks pages until media is older than `min(7, sinceDays)` days (`PlaybackUtils.getPagesUntilTimeLimit`).

#### Local (`server/Local/endpoints.ts`)

| Method | Path | Cache | Role |
|--------|------|-------|------|
| GET | `/api/proxy` | 30s | **Primary MLB JSON path:** open URL relay so the browser can load Stats API / related JSON without CORS; all such upstream calls share BT server egress (see §1) |
| GET | `/api/search` | 5 min | Elasticsearch highlight search |
| GET | `/api/changelist` | 1 min | Static release notes map |
| GET | `/auth/authorize` | — | Redirect to Patreon |
| GET | `/auth/redirect` | — | OAuth callback; set cookie; upsert user |
| GET | `/auth/status` | — | Decrypt cookie; refresh tokens; return levels |
| POST | `/auth/save-settings` | — | Persist settings on user record |
| GET | `/auth/get-settings` | — | Load user document |
| GET | `*` | — | SPA fallback |

Special: `GET /service-worker.js` sets no-cache headers (implementation looks incomplete regarding piping the file).

#### Present but not Express routes

- `server/Local/bbref/bbref-links.ts` — Baseball-Reference helper; no HTTP registration
- Swagger JSON generated into packaged `output/client/swagger.json`; no dedicated `/swagger` Express route (client ApiTest loads `/swagger.json` statically)

### 5.3 Auth design

**File:** `server/Local/auth.ts`

| Step | Detail |
|------|--------|
| Credentials | `server/config/keys.json` → `patreon.id` / `patreon.secret` |
| OAuth client | `client-oauth2`; redirect `{Config.host}/auth/redirect` |
| Token storage | DynamoDB `bbt-patrons` + encrypted cookie `auth` |
| Cookie crypto | AES-256-CBC (`keys.crypto.key32`, `iv16`); `httpOnly: false`; ~30-day cookie; short-lived access token in cookie payload forces refresh path |
| Levels | Live Patreon `current_user` pledges → reward **titles** as `levels: string[]` |
| Authorization model | Session identity on server; **feature entitlement mostly client-side** |

Client OAuth scopes (authorize URL): `users`, `pledges-to-me`, `my-campaign`.  
Server `ClientOAuth2` config also lists scopes `notifications`, `gist` (as written in code) — worth reconciling in v3.

### 5.4 Persistence & search

| Store | Usage |
|-------|--------|
| **DynamoDB** `bbt-patrons` | User id, OAuth tokens, refresh expiry, settings |
| **DynamoDB** `bbt-highlights` | Query-by-`game_pk` shortcut for empty-text single-game search |
| **Elasticsearch** `highlights-index` | Multi-match on blurb/title/description; optional `game_pk` terms; sort `game_pk` desc |
| **S3** `baseball-theater-highlights` | Legacy full-corpus load into memory — **`loadIntoMemory` commented out** in `Search.initialize` |
| **MongoDB** | URL in keys; **no runtime usage** found |

AWS region for Dynamo: `us-west-2`. ES node and AWS keys live in `keys.json` (`s3` and `aws_es` key groups).

Indexed highlight shape: `IHighlightSearchItem = { game_pk, highlight: MediaItem }`.

### 5.5 Config & secrets

| Artifact | Role |
|----------|------|
| `server/config/config.ts` | Maps `__SERVER_ENV__` → public host |
| `server/config/keys.json` | Patreon, crypto, mongo (unused), AWS creds — **checked in and copied into deploy zip** |
| `server/apikeys.json` | Playback API consumers (`playback`, `baseballtheater`, …) |
| `server/.env` | Packaged; primarily `PORT` |
| Webpack DefinePlugin | `__SERVER_ENV__`, `__PORT__` baked into server bundle |

No SSM/Parameter Store/Vault in code.

---

## 6. Shared engine (`baseball-theater-engine`)

### 6.1 Role

Thin typed façade over MLB Stats API and MLB.com video search, plus domain TypeScript contracts. Almost no business logic beyond request plumbing, team id maps, and `MlbUtils.gameIsOver`.

**Build:** `tsc` → `dist/`; consumers depend on `file:…/dist` (root) or relative `../baseball-theater-engine/dist` (client). Script: `update-engine`.

**Public barrel (`index.ts`):** contract re-exports + `MlbDataServer`.  
`mlbutils.ts` is a deep import.

### 6.2 Dual loaders

| Loader | Environment | Behavior |
|--------|-------------|----------|
| `Internal_DataLoader` | Browser | `fetch`; optional `urlTransformer`; abort in-flight by request type |
| `Internal_DataLoaderNode` | Server | `node-fetch`; no transform/abort |

### 6.3 `MlbDataServer` methods (implemented)

| Method | Browser / Node | Upstream |
|--------|----------------|----------|
| `getLiveGame` / `Node` | both | `statsapi…/api/v1.1/game/{id}/feed/live` |
| `getGameMedia` / `Node` | both | `…/api/v1/game/{id}/content` |
| `getPlayers` | browser | people + hitting season hydrate |
| `getScoreboard` / `Node` | both | schedule hydrate (sportId 1,51; leagues 103,104,420) |
| `getStandings` | browser | standings hydrate |
| `getTeamSchedule` | browser | teams + previous/next schedule hydrate |
| `getTeamDetails` | browser | teams |
| `videoTagSearch` / `Node` | both | `mlb.com/data-service/en/search?tags.slug=` |
| `videoPlaylistSearch` / `Node` | both | `…/search?sel={playlist}-video-list` |
| `videoLocalSearch` | either | **app** `/api/search` |
| `fullVideoSearch` | — | Builds Fastball GraphQL URL only; **incomplete (no fetch)** |

Apollo client packages are imported on the class but unused.

### 6.4 Domain model (contract modules)

| Module | Concepts |
|--------|----------|
| `live.ts` | `LiveData` tree: game meta, linescore, plays/PBP, pitch/hit data, boxscore, weather, flags |
| `teamschedule.ts` | Scoreboard/schedule games, decisions, records |
| `media.ts` | `GameMedia`, editorial articles, `MediaItem` + playbacks, search docs |
| `standings.ts` | Division/league standings rows and nested records |
| `teams.ts` | File codes, display names, MLB team id map |
| `PlaybackContracts.ts` | Tag/playlist enums for playback APIs |
| Legacy | `player.ts`, `pitching.ts` older shapes; little/no live use |

Client game UI is largely a typed rendering of `LiveData` + `GameMedia`.

---

## 7. Workers (adjacent, unwired)

| File | Intent |
|------|--------|
| `GameChecker.ts` | Every 60s: today’s summaries + live details; track finished games in local storage |
| `NoHitterChecker.ts` | Detect single-pitcher no-hit progress; create/edit Reddit self-posts |
| `RedditAccess.ts` | Snoowrap bot; env-based Reddit credentials |
| `CustomStorage.ts` | `node-localstorage` under `./posted` |

**Not imported** by `server.ts` and **not** referenced by root npm scripts. Imports use legacy path aliases (`@MlbDataServer`, etc.), suggesting an older layout. Do not assume this runs in production EB.

---

## 8. Build & deployment

### 8.1 Dev

```text
pnpm start → concurrently server:watch (nodemon) + client (CRA)
server inspect often on 5001; API default 8000
```

### 8.2 Production package (`server/scripts/build_v2.js`)

1. Clean / create `builds/build_{env}___{datetime}/output`
2. Webpack compile `server/server.ts` → `output/server/server.js` with env defines
3. Copy client build → `output/client`, `keys.json`, `apikeys.json`, `.ebextensions`, root-of-zip `package.json` from `server/package.json`, `.env`
4. Generate swagger into `output/client/swagger.json`
5. 7zip → `builds/{name}.zip`; delete staging dir after delay

EB start script (packaged `package.json`):  
`cd output && node --inspect=0.0.0.0:9229 server/server.js`  
(Package name still says `AllBadCards-Beanstalk-Package` — legacy.)

### 8.3 Beanstalk platform bits

- `.ebextensions/security-group-egress.config` — allow 80/443/DNS egress in VPC
- `.platform/nginx` — higher file/connection limits, WebSocket header patches  
  **Current finalize script does not copy `.platform` into the zip.**

No GitHub Actions deploy workflow (only `.github/FUNDING.yml`).

---

## 9. Security & trust boundaries (as implemented)

| Topic | Current behavior |
|-------|------------------|
| Secrets | In-repo JSON copied into deploy artifacts |
| Playback API keys | Implemented but enforcement disabled |
| Open proxy | `/api/proxy?url=` fetches arbitrary URLs server-side (trust browser/network); core MLB Stats traffic is browser-orchestrated through this relay |
| Shared MLB egress | Proxied Stats/API calls appear to MLB as coming from BT server IPs only—not from end-user networks (see §1) |
| Patron gates | Mostly client-side after `/auth/status` |
| Cookies | Auth cookie readable by JS (`httpOnly: false`) |
| CORS | Not configured on Express (SPA is same-origin; proxy exists specifically so the browser never needs cross-origin MLB REST) |

These are important v2 facts for v3 redesign (whether to keep patterns or harden).

---

## 10. External dependencies (runtime)

| Dependency | Role |
|------------|------|
| MLB Stats API (`statsapi.mlb.com`) | Live feed, schedule, standings, content, teams, people |
| MLB.com data-service | Tag/playlist video search |
| MLB Fastball GraphQL | SPA video search (Relay) |
| Patreon OAuth + API | Identity and pledge/reward titles |
| AWS DynamoDB | Users / some highlights |
| AWS Elasticsearch | Highlight full-text index |
| AWS S3 | Historical highlight corpus (loader disabled) |
| Google Cast sender | Chromecast |
| Google Analytics / Sentry | Telemetry |
| Baseball Savant (links only) | Delayed pitch/play video deep links |
| Reddit API | Orphan worker only |

---

## 11. Architectural characteristics (summary for v3 planning)

**Strengths visible in the code**

- Clear product loop: scoreboard → game tabs → video
- Shared engine keeps MLB payload types aligned across client/server
- Proxy + short cache gives a simple CORS bypass without a full BFF domain model
- Patron tiers already mapped to concrete feature gates

**Coupling & age markers**

- **Browser-orchestrated, server-egressed MLB REST** — load and rate-limit risk concentrate on BT IPs (see §1); changing this is a first-class v3 architecture choice
- CRA + MUI v4 + Relay 11 + moment + class DataStores
- Webpack 4 server bundle + EB zip ritual
- Secrets-in-repo; open proxy; client-side entitlements
- Dual video search stacks (Fastball GraphQL vs ES `/api/search` vs mlb.com tags)
- Dead/unwired paths: Schedule route, workers, S3 in-memory index, Mongo, incomplete `fullVideoSearch`

**Logical modules to preserve as concepts (even if rebuilt)**

1. Media/engine façade over MLB (whatever fetch topology v3 chooses)
2. Game live+media projection UI
3. Auth/patronage entitlement service
4. Highlight index/search (if historical search remains a goal)
5. Settings sync for supporters
6. Deployable SPA+API unit (or successor split)

---

## Related documents

- [FEATURES.md](./FEATURES.md) — user-facing capability inventory
- Forthcoming: v3 product requirements and v3 architecture (to be drafted next)

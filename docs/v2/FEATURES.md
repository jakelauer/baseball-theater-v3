# Baseball Theater v2 — Feature Inventory

Source of truth: `/Users/jakelauer/Repos/BaseballTheater` (live site: [baseball.theater](https://baseball.theater)).

This document catalogs **what the product does for users**, independent of how it is built. Incomplete or unwired features are marked explicitly so v3 planning can choose to keep, drop, or finish them.

---

## Product summary

Baseball Theater is a fan-donation-supported site for watching MLB highlights and following games via scores, play-by-play, box scores, and recaps. It is not an official MLB product and does not stream live broadcast video. Primary monetization/support is Patreon (with Ko-Fi mentioned in the README).

### How data reaches the UI (starting-point fact)

Almost all live scores, game feeds, standings, schedules, and game-content JSON are **fetched on demand by the user’s browser**. To avoid CORS limits on MLB’s Stats API hosts, those browser requests go through Baseball Theater’s **`/api/proxy`** layer. The server then calls MLB and returns JSON same-origin.

**Important consequence:** MLB does not see each fan’s IP for that traffic. It sees requests from **Baseball Theater’s server egress** (a small set of origin IPs), even though each viewer’s browser is what *triggers* every poll and page load. Video **search** via MLB Fastball GraphQL is an exception (browser → MLB directly). Video **files** themselves load from media CDN URLs in the payload.

Details and implications: [ARCHITECTURE.md §1](./ARCHITECTURE.md#1-foundational-data-fetch-model-read-this-first).

---

## Navigation & shell

| Feature | Behavior |
|--------|----------|
| Brand / home | “Baseball Theater”; games scoreboard is the home experience (`/` and `/games`) |
| Persistent sidebar (desktop) | Games, Featured Videos (partial), Standings, Search, Settings; favorite-team shortcuts when eligible |
| Mobile chrome | App bar + hamburger drawer; search shortcut in bar; on games home hamburger opens menu, elsewhere it navigates home |
| Game-level mobile nav | Bottom navigation for game tabs |
| Footer / meta | Copyright, Jake Lauer, Reddit link, “Report a Problem” → GitHub issues |
| Page titles | Per-page titles via Helmet (`"%s \| Baseball Theater"`) |
| PWA install / offline shell | Installable web app (`start_url: /games`); service worker app-shell caching |
| Update prompt | When a new SW is waiting, dialog can show changelist notes and “Update Now” |
| Error reporting | Client error boundary offers email report (stack + settings JSON) to baseball.theater@gmail.com |
| Analytics | Google Analytics pageviews on route change (non-local hosts) |
| Error tracking | Sentry on non-local hosts |

---

## 1. Daily games scoreboard

**Routes:** `/`, `/games`, `/games/:yyyymmdd`

### What users can do

- Browse all MLB (and related sportId) games for a calendar day
- Move date: previous / next / date picker / **Today**
- Open any game into the game detail experience
- See games sorted roughly: **favorite teams first → in-progress → not final → start time**
- Optionally **hide scores** (and related spoilers) via settings
- When any game that day is final, jump into highlight searches for common tags on that date:
  - `game-recap`
  - `condensed-game`
  - `player-tracking`
  - `home-run`
  - `highlight-reel-offense`
  - `highlight-reel-defense`

### Remembered state

- Last viewed scoreboard date stored in `sessionStorage` for the session

### Gaps / stubs

- `ScoreboardItem` component exists as an empty stub and is unused

---

## 2. Single-game experience

**Routes:**

- `/game/:gameDate/:gameId`
- `/game/:gameDate/:gameId/:tab`
- `/game/:gameDate/:gameId/:tab/:tabDetail`

**Tabs:** Videos (Highlights) · Live Play · Plays · Box Score · Recap (Wrap)

Opening a game without a tab redirects to the user’s **default game tab** (settings; default **Highlights**).

### Shared game behaviors

- Live data + media refresh on an interval until the game is final (`statusCode === "F"`)
- Optional on-screen refresh countdown (“update bar”)
- Faster refresh for Backers (see Patronage)
- Desktop: top tabs + back to that day’s games list
- Mobile: bottom navigation among tabs

### 2.1 Videos (Highlights)

- Featured **recap** and **condensed game** when available
- Remaining highlight clips for the game
- If MLB media highlights are empty, falls back to local highlight search and/or GraphQL free-text search
- In-app video dialog or external open depending on settings
- Quality selection (Low / Standard / High when URLs allow)
- Queue: previous / next; autoplay toggle
- Chromecast FAB when casting is available (gated)

### 2.2 Live Play

- Mini box / linescore context
- Bases, balls, strikes, outs
- Current half-inning play list
- Disabled when editorial wrap/recap media exists (finished editorial path preferred)

### 2.3 Plays

- Modes: **Scoring plays** vs **All plays** (`:tabDetail` = `scoring` \| `all`)
- Inning navigation
- Expandable plate appearances with pitch list, strike zone visualization, exit velocity / launch angle / distance when present
- Links to Baseball Savant sporty-videos by `playId` for eligible patrons (see Patronage), with a **36-hour delay** after the play

### 2.4 Box Score

- Mini linescore
- Away / home batting and pitching tables
- Game info footer
- Swipeable team tabs on small screens

### 2.5 Recap (Wrap)

- MLB editorial recap rendered from markdown/HTML
- Tab only meaningfully available when `media.editorial.recap.mlb` exists

---

## 3. Video search

**Routes:** `/search/`, `/search/:query`, `/search/:query/:date`

### Modes

1. **Free-text search** — debounced input; MLB Fastball GraphQL `FREETEXT`
2. **Date + tag (structured)** — e.g. from scoreboard day shortcuts; structured query over content tags + date

### UX

- Paginated result grid (36 per page)
- Highlight cards; GraphQL results open MP4 in a new tab (simpler than in-game dialog queue)
- Chromecast FAB on the page

Also reused internally as a fallback searcher inside the game Highlights tab.

---

## 4. Featured videos

**Route:** `/videos/:category/:tag?`

- Grid of highlights for an MLB video **tag** (default related to “best performer” / recap-tag family)
- Title derived from the tag string
- Chromecast / highlight playback patterns shared with other video UIs

### Gaps

- `:category` path segment is unused by the page logic
- Sidebar “Highlights / Recaps” nest is largely commented out; featured-video discovery in nav is thin

---

## 5. Teams (patron-gated)

**Route:** `/team/:teamFileCode` (also a parallel `SiteRoutes.Team` path shape used for links)

**Requires Star Backer** to enter the area (upsell otherwise).

### Tabs

| Tab | Behavior |
|-----|----------|
| Recent Highlights | Infinite-scroll team highlight feed from `/api/team` |
| Schedule | Month/year picker; W/L, scores, links into game pages |

### Related nav

- Sidebar lists **favorite teams** as shortcuts only for Star Backers with favorites configured

---

## 6. Standings

**Route:** `/standings/:year`

- Division tables with: Team (links to team page), W, L, PCT, GB, M#, RS, RA, Diff, xWL, xWLP
- Year is in the URL but the page currently fetches standings for “now” rather than honoring `:year`

---

## 7. Settings

**Route:** `/settings`

| Setting | Default | Effect |
|---------|---------|--------|
| Favorite teams | `[]` | Pin/sort on scoreboard; team nav (Star); filters out `chw` quirk in UI |
| Default game tab | Highlights | Where `/game/...` lands without a tab |
| Hide scores | off | Spoilers off on scoreboard / mini box |
| Highlight descriptions | on | Show clip description text |
| Show update bar | on | Live refresh countdown UI |
| Autoplay | on | Dialog queue autoplay (requires dialogs) |
| Dialogs | on | In-app video dialog vs open link |

### Sync

- Non-Backers: settings in **localStorage**
- Backers+: settings **synced to server** (load/save via auth endpoints)
- Non-Backers see an upsell note that Backers can sync settings

Default-tab UI offers Highlights, Box Score, and Live Play (not Wrap/Plays).

---

## 8. Patronage & account

### Account actions

- Join Patron (external Patreon campaign)
- Log in via Patreon OAuth
- Log out (clears auth cookie and refreshes auth state)

### Levels (reward titles from Patreon, cumulative on client)

`Backer` → `Pro Backer` → `Star Backer` → `Premium Sponsor`

Owner/admin user id bypasses level checks on the client.

### Feature gates (client-enforced)

| Capability | Minimum level |
|------------|---------------|
| Faster live poll (5s vs 30s) | Backer |
| Cloud-synced settings | Backer |
| Chromecast cast / FAB intercept | Pro Backer |
| Savant play/pitch video links (+ 36h delay) | Pro Backer |
| Team highlights API usage | Pro Backer (Teams area also requires Star) |
| Teams area + favorite-team sidebar links | Star Backer |

Upsell modal is shown when gated features are attempted.

**Note for v3:** Server mostly does **not** re-check patronage on content APIs; trust is client-side + OAuth session.

---

## 9. Chromecast

- Detects Cast availability via Google Cast sender SDK
- FAB on Highlights, Search, and Team Highlights
- Casting intercepts quality-link playback when a session exists
- Gated to Pro Backer+

---

## 10. API explorer (internal / power-user)

**Route:** `/apitest`

- Swagger UI against packaged `/swagger.json`
- Response body viewer (`react-json-view`)
- Not linked from primary product navigation

---

## 11. Playback / media catalog APIs (server-exposed)

These power (or can power) video discovery beyond the SPA’s direct MLB GraphQL/proxy usage. Some are more “API product” than first-class UI today.

| Capability | User/API value |
|------------|----------------|
| Team highlights by team code | Paginated team-tagged videos |
| Compilations by playlist type | Themed multi-play playlists (bloopers, clinches, etc.) |
| Recaps by recap tag | Feature/recap-style tag feeds |
| Single-play tags | Defense, HR, walk-off, filthy pitch, etc. |
| Non-play tags | Interviews, injuries, ceremonial first pitch, etc. |
| Text search of indexed highlights | Free-text (+ optional game ids) over historically indexed media |
| MLB JSON proxy | CORS bypass so the SPA can load Stats API JSON; browser-orchestrated, shared BT server egress to MLB (see product summary / architecture §1) |

Tag/playlist taxonomies are enumerated in the engine (`CompilationPlaylists`, `RecapTags`, `SinglePlayTags`, `NonPlayTags`).

---

## 12. Ops / release communication

- **Changelist** endpoint returns dated bullet lists of release/ops notes
- Consumed by the client update dialog when a new service worker is available

---

## 13. Workers / bots (implemented but not productized in this repo)

Code exists for:

- Polling today’s games on a 60s interval
- Detecting no-hitter progress
- Posting/updating alerts on Reddit (`r/BaseballTheaterBot`)

There is **no bootstrap** from the main server or npm scripts in this repository, so these are not live product features of the deployed EB app as wired today. Treat as historical / unfinished adjacent product.

---

## 14. Defined but not shipped in the router

| Item | Status |
|------|--------|
| `/schedule/:year/:team?` | Path helper exists; **no route registered** |
| Featured video sidebar taxonomy | Mostly commented out |
| Standings year param | In URL; **not used** by fetch |
| Featured `:category` | In URL; **not used** by page |

---

## Feature map (quick reference)

```
Scoreboard (by date)
  └─ Game
       ├─ Videos / Highlights (+ Chromecast)
       ├─ Live Play
       ├─ Plays (± Savant links)
       ├─ Box Score
       └─ Recap

Search (free-text | date+tag)
Featured Videos (by tag)
Standings (by division)
Teams ★ (highlights + schedule)
Settings (± cloud sync for Backers)
Account (Patreon OAuth + tier gates)
PWA (install + update + changelist)
```

---

## Out of scope of the current product (explicit non-features)

- Live TV / radio stream playback of MLB.TV broadcasts
- Ticket sales, fantasy roster management, betting
- Full official schedule browser page (path exists, UI not wired)
- Server-enforced entitlement on most media endpoints
- Active in-repo Reddit no-hitter bot deployment

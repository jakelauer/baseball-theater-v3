# Baseball Theater v3 — Visual Design

**Status:** Drafting (direction **accepted** for brand, chrome bans, and information shape)  
**Depends on:** [INTENT.md](./INTENT.md) (pillars), [FEATURES.md](./FEATURES.md) (surfaces)  
**Implementation home:** `web/` (React + Vite + **Mantine 7**, ADR-008)  
**Not this doc:** stack, data topology, entitlements — those stay in [ARCHITECTURE](./ARCHITECTURE.md) and FEATURES.

This is the visual and interaction source of truth. FEATURES says *what users get*; this says *how it looks, sits on the page, and behaves*.

v2 remains a **capability menu**, not a look to copy. Sharing a primary red with the old site is fine; copying v2’s Material chrome, logo tiles, or photo cards is not.

The scaffold (`web/src/styles.css`, `App.tsx` theme) still uses an older night-park palette. **This document wins.** New UI work implements the tokens and rules below; leftover scaffold styles are debt.

---

## North star (visual)

A **modern 2026** public web app for superfans and statheads: scores, stats, videos, and the rest of the carried loop. **Simple and beautiful, full-featured, very intuitive.**

It should feel like the product already knows what you came for — scores you can read instantly, a path into every deeper cut (plays, box, video, recap), and nothing in the way. Summary views lead to detailed views. You can find everything you hope to find.

The UI is **tactile and modular**, not graphics-heavy. Controls and information do the work. No ads, no headline stack, no photo-led browsing or marketing chrome, **no team logos**. Small functional player headshots (e.g. pitcher / batter on Live) are fine — this is not a storefront that needs big photos to sell.

**Three accepted host pairings:** **mobile**, **medium**, and **desktop**. Mobile is compact game status and no box score on Live. Medium is the standalone game (no app nav rail). Desktop is that same medium game plus the persistent nav rail — not a third arrangement of Live modules. Views receive the pairing they were given. Do not invent more breakpoints.

Each person can change **how the UI presents for them**. Those presentation settings are first-class and honored everywhere they apply — not one-off ifs on a single page.

---

## 1. Design goals

If a visual choice doesn’t serve one of these, cut it.

| # | Design goal | Serves | Means |
|---|-------------|--------|--------|
| D1 | **Exactly what you came for** | G5, north star | Information scent: the next click is obvious; search, standings, and game rooms are where you expect |
| D2 | **Simple and beautiful, full-featured** | G5 | Quiet chrome; density where numbers live; no feature hidden behind a “pro” aesthetic on the free surface |
| D3 | **Tactile, not graphic** | D2 | Buttons, modules, type, and team color — not illustration, decorative viz, or photo-led layouts. Small functional player headshots are allowed; stadium stills, collage heroes, and poster browsing are not |
| D4 | **Summary → detail** | G5 | Every level is a complete view that opens a richer one (day → game → tab → at-bat → pitch) |
| D5 | **Highlights and game understanding first** | FEATURES principle 1 | Scoreboard is the lobby; a game is rooms (video / live / plays / box / recap), not a news page. **Live is the pitch theater** |
| D6 | **Insight is visible product** | G2, G4 | Impact order and inning notes are modules with rank/label — not a wall of equal rows |
| D7 | **Respect attention** | G5 | Live updates patch in place; motion is rare; presentation settings (spoilers, emphasis, entry room, …) are obeyed |
| D8 | **Patronage is power, not a lock screen** | G3 | Free experience is complete; paid depth is extra, not a greyed-out homepage |
| D9 | **Honest about data** | FEATURES principle 6 | Freshness and source are readable; we don’t costume ourselves as MLB.com |
| D10 | **Three host pairings** | G5 | **mobile** (compact status, no box on Live) · **medium** (standalone) · **desktop** (medium + nav rail). Design mobile first. Do not invent a fourth pairing |
| D11 | **Presentation is personal** | Settings | Views read settings they care about (sort, default tab, hide scores, game-row slot, collapse non-favorites, …). Don’t invent a second store between settings and the view |

**D7** and **D11** are behavior rules and this document owns them. *How* the client is wired to honor them — one server read cache that live updates patch instead of replace, and a settings store views read directly — is [ARCHITECTURE ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted).

### Hard bans

| Ban | Meaning |
|-----|---------|
| **No ads** | No promo rails, sponsored modules, or leftover “for our patrons” interstitial on the homepage |
| **No headlines** | No news-site hero, ticker, or stack of article titles. Recap lives *inside* a game as a document module, not as the front door |
| **No photo-led chrome** | No news-article heroes, stadium stills, collage heroes, promo photos, or photo thumbnails as card / search / video browsing faces. **Playing a video is the product;** a still poster/frame is not the browsing language. **Allowed:** small functional player headshots used as identity marks (pitcher / batter on Live, similar inline marks elsewhere) — not as a layout that sells with large images |
| **No team logos** | Never. Not in nav, scoreboard, standings, favicon-sized marks, or “logo or fallback.” Identify teams with **colors, names, cities, and abbreviations only** |
| **No decorative graphics** | No ambient blobs, park illustration, texture overlays, or motion backgrounds. Functional viz (strike zone, trajectory, diamond) is allowed because it *is* the data |
| **No extra pairings** | Only mobile / medium / desktop. Desktop is medium + rail, not a different Live. Do not invent phone / tablet / web / compact / expanded as extra products |

### What we are not

| Avoid | Why |
|-------|-----|
| Night-park / turf / clay atmosphere | Replaced by the brand tokens in §3 |
| Logo tiles, cap marks, photo cards as browsing chrome | Banned above (small Live headshots are not “photo cards”) |
| MLB.com / ESPN clone | Differentiation (G2); also those sites are photo- and headline-led |
| Dashboard soup (every metric equally loud) | Full-featured ≠ everything visible at once; summary → detail |
| Graphics-heavy “broadcast package” | Tactile UI; type and modules |
| Mystery-meat icons | Non-standard / product-specific icons need a visible label. Universally understood chrome (menu, search, account, help `?`, ← back) may be icon-only |
| A fourth layout named “phone” / “tablet” / “web” | The three pairings are already named. Desktop is medium + rail |
| Treating “no spoilers” as blanking score numerals | Structured scores and free-text titles (video/recap strings with the result baked in) come from different places. Hiding `5–3` does not scrub “Yankees win 5-3” in a title |

---

## 2. Product loop → visual jobs

The carried loop is **scoreboard → game (videos / live / plays / box / recap) → search → standings → settings**. Each surface is a **module or a set of modules**. New themes (impact, inning feed, day digest, AI, multi-source links) land *inside* these rooms, not as a second app.

```text
  Summary                         Detail
  Scoreboard (day of games)  →    Game (rooms)
       │                              │
       │                         Videos · Live · Plays · Box · Recap
       │                              │
       │                         at-bat → pitch
       │
       └──── day digest / “best of” is another summary module on the lobby when it ships
```

| Surface | Visual job | Functional job (FEATURES) |
|---------|------------|---------------------------|
| **Shell** | Wayfinding and account; never a magazine header | Persistent nav; sign-in later |
| **Scoreboard** | Today’s slate at a glance | Day’s games; status; scores (unless hidden); enter a game |
| **Game · Videos** | Watch what mattered | Highlights in a responsive grid (list toggle + sort/filter); typographic cells, not posters |
| **Game · Live** | Where the game is *right now* — **this is the pitch theater** | Diamond + runners, BSO pips, win-probability chart, pitcher/batter above zone, strike zone, trajectory, accordion (newest top); later: inning insight feed. **No linescore** |
| **Game · Plays** | Archive of at-bats | Linescore + historical play list; later: Savant / multi-source. Pitch reconstruction of the current at-bat lives in **Live** |
| **Game · Box** | The ledger | Linescore + batting / pitching tables; venue/location after start |
| **Game · Recap** | The story after | Linescore + MLB editorial and/or BT game package — a document, not a headline |
| **Search** | Find a clip across days | Free-text + date/tag; typographic results |
| **Standings** | Season context | Division tables; team color + name/abbr, never marks |
| **Settings** | Edit the user’s settings; other views read those values | FEATURES owns *which* settings exist; groups by site area |

### Hierarchy of attention (inside a game)

1. **Who’s playing, what’s the state** — abbr + record when scores show, team color, score (or hidden), status  
2. **The current room** — list, zone, diamond, table, recap prose  
3. **Supporting evidence** — accordion pitch rows, blurbs, source links, insight modules  

Never add a fourth column of related photos, headlines, or ads.

---

## 3. Color scheme

**Accepted.** Five brand tokens. No other brand hues. Do not revive `--bt-field` / `--bt-clay` / `--bt-chalk` or Mantine **teal** as the product primary.

### Cascading first (accepted)

Styling that is meant to be global must stay **minimal and cascading**. Put color in the theme once. Views should almost never name a color.

| Do | Don’t |
|----|--------|
| Wire the five tokens into Mantine `createTheme` + a tiny root CSS sheet (grounds, text, borders) | Scatter `#CE0F0F`, `rgba(...)`, or `var(--bt-*)` through pages and modules |
| Use semantic Mantine props (`color="primary"`, `c="dimmed"`, default Card/Badge styles) | Per-component style objects that pick brand hexes |
| Keep page/text/border roles in the theme (dark only) | Duplicate ground/text rules in every view |
| Exceptions only for **data** color (team accent, MLB pitch `ballColor`) | Treating every border and fill as a one-off |

If a view needs a new brand hue, that is a **theme change**, not a local style. Prefer fewer CSS variables and fewer overrides over a large token catalog.

| Token | Hex | CSS (theme root only) | Role |
|-------|-----|------------------------|------|
| **Primary** | `#CE0F0F` | `--bt-primary` | Brand, wordmark accent, primary actions, selected control, strike fallback |
| **Dark** | `#211819` | `--bt-dark` | Page ground (the only page ground) |
| **Light** | `#FFF2D3` | `--bt-light` | Text and hairlines (warm cream, not white) — never a page ground |
| **Accent** | `#F5AD1D` | `--bt-accent` | Impact, emphasis, “watch first,” warm highlight |
| **Accent 2** | `#72D991` | `--bt-accent-2` | Live, positive, in-progress, ball fallback |

Mantine `primaryColor` is a custom red scale anchored on **Primary**, not teal. Accents map into the theme the same way so components say `color="accent"` (or whatever the theme names), not a hex.

`theme-color` / browser chrome is always **Dark** (`#211819`).

### Mode

**Dark only (accepted).** There is no light mode and no system-following color scheme. Same five tokens; grounds do not invert.

| | Dark |
|--|------|
| Page | Dark `#211819` |
| Text | Light `#FFF2D3` |
| Raised module | Dark, slightly edged with Light at ~12% |
| Primary / Accent / Accent 2 | Unchanged |

**Default (accepted):** locked dark. Mantine `defaultColorScheme="dark"`. Do not use `auto` or `prefers-color-scheme` to flip grounds. S24's `defaultColorScheme="auto"` is **debt** until it is locked.

No color-mode setting. Do not draw Light / Dark / System controls.

A setting may **re-tint** chrome from a team color the user chose. That is a theme overlay (primary/accent shift), not local hex on each view, and not a logo. Contrast rules still apply.

Do not add extra page gradients. Flat grounds; modules separate with theme borders, not drop shadows and glow.

### Semantic color

Meaning lives in the theme. Views pick a **role** (primary, live, muted), not a paint chip.

| Meaning | Theme role | Notes |
|---------|------------|--------|
| Brand / CTA / selected | Primary | Also strike fallback when MLB `ballColor` is missing |
| Live / in progress | Accent 2 | **Blinking** live dot + status label (LIVE or inning like Bot 7). **No colored background / pill.** Module does not throb |
| Preview / scheduled | Muted text | Time is the data |
| Final | Muted text | **Not** Primary — red is brand and strikes, not “game over” |
| Impact / watch first | Accent | Rank index, featured row marker |
| Insight / AI | Muted + label (or soft Accent 2) | Attributed; not neon |
| Ball | Accent 2 | Or MLB `ballColor` when present |
| Out / retired | Muted | Result labels |
| Error | Primary | Copy, not a painted page |
| Structured score hidden | Muted; no numerals | Only covers score *fields*. Free-text titles are a separate problem (see §5a) |

Pitch dots follow `pitch.details.ballColor` when MLB sends it, else theme strike/ball roles. That is data coloring, not a second brand.

### Team colors

**Accepted:** use them — as **data**, not as a second stylesheet.

- Each team is identified by **official (or BT-normalized) colors + city + name + abbreviation**. Never a logo file.
- On a game module, **away and home each own a side**: color bar or edge, name/abbr, score. Do not merge both palettes into one background wash.
- Team color is a **structural accent** (edge, swatch, score numeral, underline) — enough to read “who” at a glance. It is not a full-bleed page theme and must **contrast** on the Dark ground. If a team color fails contrast, darken/lighten a derived value at the data/theme boundary; do not fall back to a logo.
- When settings emphasize a team, show **color + abbr (or city)** in chrome — not a mark.
- Views receive a team color value; they do not hardcode Yankees blue.

---

## 4. Typography

UI type is **one readable sans** for almost everything. This is a tools-and-numbers product, not an editorial magazine (that would be headlines).

| Role | Family | Why |
|------|--------|-----|
| Wordmark, UI, body, tables | **IBM Plex Sans** (400/500/600/700) | Tabular-friendly, modern, tactile; one family keeps the UI calm |
| Fallback | system-ui / Segoe UI / sans-serif | |

Scaffold **Fraunces on headings** is **out** — it reads as editorial/headline. The wordmark is the name “Baseball Theater” in Plex (semibold/bold), Primary on the word *Theater* or a Primary underline — not a serif masthead.

Self-host later if privacy/perf warrants; visual spec does not depend on the Google Fonts CDN.

### Scale

Stay on Mantine’s type scale. Opinionated uses:

| Element | Treatment |
|---------|-----------|
| App wordmark | Strong sans, not a logo image |
| Page title | `Title` order 2 |
| Score (revealed) | Extra-large, heavy, tabular (`fw={700}`, `size="xl"` or larger) |
| Matchup | **Abbr** first for glance (NYY @ BOS); **city + name** as secondary (`New York Yankees at Boston Red Sox`) |
| Meta (venue, date, fetched-at) | `sm`, muted |
| Tables (box, standings) | Tabular nums (`font-variant-numeric: tabular-nums`) |
| Recap / insight prose | Body size, roomier line-height; recap *title* is document title, not a homepage headline |

---

## 5. Layout — three host pairings

The layout system is **modules** plus one of three accepted **host pairings**. A **module** is a bounded region with one job (one game, one at-bat, one table). Opening a module (or a row inside it) is how you go from summary to detail.

### Pairings (accepted)

| Pairing | What it is | What it is not |
|---------|------------|----------------|
| **`mobile`** | Compact game status; **no box score on Live**; single column; usable in a ~360–390px pane | A lite product. Box is still its own room |
| **`medium`** | Standalone game — full status, rooms, no app nav rail | A different Live than desktop |
| **`desktop`** | The **medium** game plus the persistent ~240px nav rail | A third arrangement of Live modules |

The **host** (route, shell, or size-aware wrapper) **passes the pairing in**. The default host uses these three. Do not add a fourth.

```text
mobile                         medium                         desktop
┌─ game (compact status) ─┐    ┌─ game (standalone) ─┐    ┌─ rail ─┬─ game (same as medium) ─┐
│ no box on Live          │    │ no rail             │    │ nav    │                        │
└─────────────────────────┘    └─────────────────────┘    └────────┴────────────────────────┘
```

Design every surface in **mobile** first. Then **medium** as more room for the *same* modules. **Desktop** adds chrome, not a new Live.

### What may not drive layout

| Not allowed | Why |
|-------------|-----|
| A fourth pairing (`phone`, `tablet`, `web`, `compact`, `expanded`) | Three is the list |
| Desktop Live that rearranges modules differently from medium | Desktop is medium + rail |
| `Foo.mobile.tsx` vs `Foo.desktop.tsx` as different products | Same modules; pairing is a prop |

| Allowed | Why |
|---------|-----|
| A pairing prop, data attribute, or context (`data-layout="mobile"`) | Host is explicit |
| CSS that *styles* `[data-layout="mobile"]` vs `medium` vs `desktop` | Pairing is already chosen |
| **Container queries on the host pane** (`@container`) | A *host* may use pane size to *choose* among the three |
| The default host using viewport width to pick mobile / medium / desktop | That is the accepted strategy |

Scaffold `AppShell` `navbar.breakpoint: "sm"` becomes the **desktop** pairing (rail on) vs **medium** (rail off) — not an unnamed extra breakpoint.

### Shell

Mantine `AppShell` stays as chrome, not as a content metaphor.

| Region | Mobile | Medium | Desktop |
|--------|--------|--------|---------|
| Header | 56–64px; burger / wordmark / account | Wordmark + date + search + account | Same as medium |
| Nav | Overlay drawer, or a compact rail the host opens | None (standalone) | Persistent ~240px rail |
| Main | One column of modules | Module canvas | Same canvas beside the rail |

**Nav items (MVP):** Scoreboard · Standings · Search · Settings. No Featured Videos, no team-logo rail. If settings emphasize teams, those are compact **color + abbr** rows under the primary links.

Drop `v3 · local fixtures` on public builds.

**Footer:** optional, quiet — copyright / report a problem. Not a second nav, not headlines.

### Scoreboard (summary)

- Date control (prev / today / next / picker) first — not buried.
- Quiet meta: date, window mode, last fetched (D9).
- Each game is a **module-as-link** (the matchup/score side opens the game).
- Anatomy: away (color, **abbr + record when scores show** — e.g. `NYY (91-71)`) · score · home (same) · time · **right-hand slot** (see below). **No logo, no photo hero, no headline.** Do not use city + full name as the scoreboard subheader under the score.
- **Venue / game location on the list only while scheduled (pre-game).** Once live or final, location leaves the scoreboard row — it appears on **Box** (and only there among list vs rooms for location).
- **Mobile:** one column of game modules. **Medium / desktop:** 2–3 columns of the *same* module — not a different card.
- Order and emphasis follow **settings**. Score *fields* can hide; title strings are not the same problem (§5a).

**Right-hand slot (accepted).** Every full game row has a modular block aligned to the **right**. One setting picks what that slot shows for the list. Occupants include:

- Game status (scheduled time / live / final)
- **Room menu** — a stack of links matching the game-detail tabs available for that game’s phase (see room presence below)
- Win probability

The slot is the same hole; contents swap. Do not invent a second row species for each occupant.

**Collapsed non-favorites (accepted).** A setting collapses games that do not involve a favorite team into a **smaller bar** by default. Favorite-team games stay the full module. The bar is the same game (matchup + score, or hidden), not a different object. The user can expand a collapsed bar. House default for the setting is **on** once favorites exist; with no favorites, every game stays the full module.

### Game (detail)

Design the **mobile** game first: ← back header + room switcher + one room. **Medium** is the same rooms with more parallel modules. **Desktop** is medium plus the nav rail.

- **← back** is a control on the header bar. It returns to that day’s scoreboard (or dismisses this view), not a generic home.
- Header module: ← back · both teams (color + **abbr + record when scores show**) · status · score (structured field — hideable when that setting exists).
- Room switcher in the URL when the game is the main route (`/game/:gamePk/:tab`). Another host may keep room state locally or still sync the URL — **open** (§9). The chrome follows **pairing**, not the route.

**Mobile room chrome:** pick **one** — scrollable top tabs *or* a bottom bar — and use it for every `mobile` game. Not both. **Open** (§9).

**Possible rooms:** Videos · Live · Plays · Box · Recap. Which room opens first is a **presentation setting**, not a design-doc default.

**Room presence (accepted):** Live and Recap are never both in the bar.

| Phase | Live | Recap |
|-------|------|--------|
| Pre-game (before first pitch) | Hidden | Hidden |
| In progress | Shown | Hidden |
| Final | Hidden | Shown when the recap is available |

| Tab | Mobile | Medium / desktop (same modules) |
|-----|--------|----------------------------------|
| Videos | Responsive grid (column count grows with width) + list toggle; sort/filter tool chrome | Same; more columns |
| Live | Compact status + pitcher/batter above zone + zone + trajectory + accordion. **No linescore** | Same modules; still **no linescore** |
| Plays | Linescore + historical at-bat list | Same, wider measure |
| Box | Linescore + team switcher (color + name); one table at a time; venue/location after start | Away/home may sit side by side |
| Recap | Linescore + long-form document | Same document, wider measure |

### Live (the pitch theater)

**Accepted:** there is no standalone Pitch Theater. Live *is* that view, plus game status.

Functional viz — allowed. Keep it sparse: lines, dots, type. No park illustration behind the zone.

Game status on Live:

- Baseball **diamond** with base runners
- **BSO pips** (balls / strikes / outs)
- **Win-probability chart**
- Current **pitcher / batter** as name + optional small headshot (functional identity mark — not a photo hero)

**Pitcher / batter cards** sit **above the strike zone**, each spanning **half the zone’s width**.

Pitch sequence is an **accordion list** — newest pitches at the top; **most recent pitch expanded by default** — not horizontal chips or tags. Draw collapsed and expanded row states.

**No linescore on Live** at any pairing. Linescore lives on Plays, Box, and Recap.

```text
mobile                              medium / desktop (desktop adds rail)
┌─ ← header ─────────┐              ┌─ ← header ─────────────────────────┐
│ compact status     │              │ status: diamond · BSO · win prob   │
│ diamond + BSO      │              │ pitcher (½) │ batter (½)           │
│ pitcher │ batter   │              │ zone          │ trajectory         │
│ zone               │              │ accordion (newest top; latest open)│
│ trajectory         │              └────────────────────────────────────┘
│ accordion          │
│ (no linescore)     │
└────────────────────┘
```

Zone ~220×280. Stack vs side-by-side is **pairing** (mobile stacked under the half-width cards; medium / desktop may sit zone beside trajectory).

### Search, Standings, Settings

Search results: **typographic rows** (title, date, teams as color + abbr) — not a photo gallery. Standings: tables with color + name/abbr. Settings: grouped by **site area** (Game list · Game detail · Account — see §5a). All three have mobile and medium / desktop hosts.

### Density (inside a pairing)

| Context | Density |
|---------|---------|
| Scoreboard, video lists | Comfortable hit area |
| Box, standings | Compact — numbers first |
| Pitch accordion, live play list | Compact, clear selected / expanded state |
| Recap, insight prose | Roomy |

`defaultRadius: "md"` — modules feel like objects you can press. The strike zone is the sharp-line exception.

---

## 5a. Settings that change presentation

Users will have settings that change **how the same views look**. There is no light/dark setting — the product is dark only.

**Accepted settings (this document):**

| Setting | Group (site area) | What the view does |
|---------|-------------------|--------------------|
| **Game-row slot** | Game list | The right-hand block on each full scoreboard row shows the chosen occupant (status, room menu, win probability, …) |
| **Collapse non-favorites** | Game list | Games that do not involve a favorite team render as a smaller bar by default |

FEATURES and the backlog still decide any setting not listed here (favorites, default game tab, hide scores, …).

**Rule:** views read those settings directly. There is no extra object between settings and the view. Don’t invent a second store that settings write and views read.

Settings are their own kind of state, separate from the server read cache — see [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted).

### Settings view

- Group controls by **site area** (Game list, Game detail, Account, …) — not by preference type (“How it looks”)
- Plain labels; changing a control updates the UI **without a reload**
- Persist however FEATURES says (local first is fine)
- Mobile Settings is one scrolling column; medium / desktop may use two columns of the same groups

### When you build a view

| If a setting can… | Do this in the view |
|-------------------|---------------------|
| Change order / emphasis | Sort/weight from the setting. Don’t bake one order into the page |
| Choose the first game tab | Open the tab the setting names. Don’t hardcode Videos |
| Choose the game-row slot occupant | The right-hand block shows that occupant. Don’t hardcode status |
| Collapse non-favorites | Non-favorite games are the smaller bar by default. Don’t bake every row as the full module |
| Tint chrome from a team | Theme overlay — not hex on each view |

A setting you haven’t shipped yet does not need a hook. Don’t pre-build a layer for knobs that don’t exist.

### No-spoilers / hide scores (harder than it looks)

Hiding a structured score field (`5 – 3` on a scoreboard card) is easy. That is **not** the whole problem.

Video titles, recap titles, and similar copy often have the outcome **embedded in a string** from another source (“Yankees win 5-3”, walk-off language, etc.). Blanking numerals in the scoreboard does not scrub those. A shared presentation layer does not either — the leak is in the data shape, not in how many hops sit between settings and the view.

When FEATURES specifies no-spoilers, treat structured scores and free-text titles as **separate** surfaces with an explicit product rule (hide / replace / omit the row / something else). Do not pretend one `hideScores` boolean on score fields is enough.

---

## 6. Interactions

The test: a superfan can land on the scoreboard and reach any deeper fact (a pitch, a box line, a clip, a standing) without hunting. **Progressive disclosure**, not hidden modes.

### Navigation

- Sidebar links are router links; active = path prefix.
- Close the mobile nav drawer on navigate.
- Opening a game is a host decision: replace the frame, or add another view. The game view receives one of the three pairings.
- Keyboard: visible focus. Accordion pitch rows and zone dots are buttons; arrow keys between pitches when Live is polished.

### Scoreboard

| Action | Behavior |
|--------|----------|
| Open game | Host chooses how to place the game view and which pairing to give it; entry **room** comes from settings (Videos if unset) |
| Change date | `/games/:date`; remember last date for the session |
| Hover / focus | Border/contrast; optional 160ms lift — no bounce, no glow wash |
| Live | Accent 2 blinking dot + status label; no colored background on the indicator |
| Open collapsed bar | Expands that game to the full module |
| Structured score hidden | Score *fields* follow the setting; card size stays stable. Free-text titles need their own rule (§5a) — blanking numerals is not enough |

### Live updates (BT-backed)

- Patch in place: scores, inning, lists. Do not remount or steal focus from an open at-bat.
- Quiet last-updated. No countdown “update bar.”
- Game final: status changes; no modal.

### Game tabs

- Route change (shareable).
- **Live / Recap presence follows phase** (§5): hide both pre-game; Live only while in progress; Recap when available after final — never both.
- Other empty rooms may stay in the bar with one sentence when appropriate.
- Entry room comes from settings. The house fallback (when unset) is Videos (or the first available room for that phase).

### Videos

- Default browse is a **responsive grid** (column count grows with pairing/width) with a control to switch to a **list**.
- Sort and filter tool chrome is present; exact dimensions are **open** (§9) until product picks them.
- A cell/row is the control: title, duration, impact mark. Click plays **in-app** (settings may allow external).
- Queue: previous / next; autoplay from settings.
- Space play/pause; Esc closes a dialog if we use one.
- **Do not** use photo posters as the browsable surface.
- **Player disclaimer (required, always):** under the player, verbatim:

  > DISCLAIMER:  
  > This video is provided by MLBAM and MLB.com and has no affiliation with or connection to Baseball Theater. It has been displayed on your device via a public API provided by Major League Baseball.

### Live / pitch theater

| Action | Behavior |
|--------|----------|
| Expand at-bat / pitch row | Accordion; **newest pitches at top**; **most recent expanded by default** |
| Click zone dot or accordion row | Selects that pitch; stops animation |
| Animate pitch | Explicit control; reduced motion → path only, no flight |
| Missing location | Copy; accordion rows still work |

Tooltips are extra; accordion rows carry the same facts.

### Search

- Debounced input; results replace in situ.
- Date + tag shortcuts are filter chips, not a mini-app.

### Settings & auth

- Presentation controls: grouped, labeled, live-applied (§5a). Persist as settings (local first; sync when FEATURES says).
- Sign in: magic link and passkey first. “Connect Patreon” is a secondary row.
- Gated links stay visible with a short tier affordance.

### Motion budget

| Allowed | Disallowed |
|---------|------------|
| Pitch / batted-ball flight (user-started) | Auto-animating lists, parallax, gradient motion |
| Slow live-indicator blink (Accent 2 dot only; label has no colored bg/pill) | Module throb, staggered entrances, live status pill fills |
| 160ms border/lift | Springy overshoot |
| Tab / accordion height | Layout thrash on every live tick |

`prefers-reduced-motion: reduce` kills flight and live pulse.

### Empty, loading, error

| State | Treatment |
|-------|-----------|
| Loading | Centered `Loader`; keep the page title |
| Error | Short Primary-colored copy + recovery hint. No stack traces |
| Empty | One muted sentence |

---

## 7. Component language

**Mantine-first** (ADR-008). Custom work only for baseball-specific tools (zone, trajectory, diamond, player).

Screens are compositions of **components**. A component has its own compact / expanded (or open / closed) states. Those are not host pairings. Draw the states that change the look — do not leave them implied by one happy-path screen.

**Figma file (accepted):** lean on reuse. The file is a library that happens to have screens, not a deck of one-off artboards.

- The five brand tokens are **color variables**. Type roles are **text styles**. Frames bind to them; they do not paint local hex.
- Recurring UI is a **component** with **variants** or **properties** (game row full/collapsed, slot occupant, accordion, header, nav, video row, wordmark, tooltip). Screens are **instances**.
- Host pairings reuse those instances. Desktop = medium instances + the rail instance.
- The test: change a token or a component once, and every screen updates. Detached copies of the same object on two frames are a defect.

| Pattern | Use |
|---------|-----|
| `Card` (module) | Scoreboard games, at-bat header, insight notes |
| Right-hand **slot** | Modular block on each full scoreboard row; occupant is a setting |
| Collapsed **bar** | Non-favorite game row when that setting is on |
| `Badge` | Status, pitch count, result, impact — color from §3 |
| `Tabs` | Game rooms |
| `Accordion` | Pitch list on Live (collapsed + expanded) |
| `Tooltip` | Extra facts on hover/focus; the control still has a label. No mystery-meat |
| `NavLink` | Shell |
| `Table` | Box, standings |
| Custom SVG / Box | Strike zone, trajectories, bases — geometry, not illustration |

**Component states to design** (not a second product — the same object, two sizes or two contents):

| Component | States |
|-----------|--------|
| Scoreboard game row | Full module · collapsed bar |
| Game-row slot | At least two occupants (status, room menu, win probability) |
| Pitch accordion | Collapsed · expanded |
| Tooltip | Closed (control only) · open |
| Mobile room chrome | Once O2 is picked — one chrome, not both |

**Impact / insight:**

- Impact: Accent rank (`1`, `2`, `3`) or a “Watch first” marker.
- Notable-but-low-leverage: muted badge (“Notable”).
- Inning insight: stacked modules with inning label; append-only; don’t jump the reader.
- Source chips (MLB · Savant · FG · BBRef): type only; new tab.

**Video rows:** duration as type, Primary play control, Accent for impact. Recap/condensed are labels on the same row species — not a different graphic object.

**Favicon / PWA icon (if any):** letterform or simple Primary mark — **not** a team logo, **not** a photo.

---

## 8. Scaffold vs this spec

New UI work moves to the right column. Do not “fix” pages by reintroducing logos, photo-led browsing, teal, or turf gradients.

| Area | Scaffold now | Target |
|------|----------------|--------|
| Palette | Field / clay / chalk + teal | Five tokens in theme only; views use roles, not hex |
| Color mode | S24 `defaultColorScheme="auto"` (follows the OS) | Locked dark — `defaultColorScheme="dark"`; no light mode, no Settings toggle |
| Type | Fraunces headings + Plex | Plex everywhere |
| Team identity | Text abbr only | **Colors + city + name + abbr; never logos** |
| Media chrome | (none) | Video as rows + player; **no poster browsing**; small Live headshots OK |
| Shell | Header + sidebar; navbar `breakpoint: "sm"` | Desktop pairing shows the rail; medium is standalone; mobile nav is a drawer |
| Layout | Viewport-ish grid (`sm` 2-col) | Host picks mobile / medium / desktop |
| Presentation | None | Views read settings when those settings exist |
| Scoreboard | 2-col cards, no date control | Date controls; same module in 1- or n-col by pairing; right-hand slot; collapsed non-favorite bar |
| Game header | Matchup + score | ← back on the bar; team color; score can hide without the header collapsing |
| Game tabs | Five tabs, some stubs | Phase-aware bar (Live vs Recap never both); Live is the pitch theater; fill rooms |
| Videos | Title list | Responsive grid + list toggle + sort/filter chrome; player with MLBAM disclaimer |
| Live | Inning / outs stub | Diamond, BSO, win prob, pitcher/batter above zone, zone, trajectory, newest-first accordion; **no linescore**; small headshots OK |
| Plays | Zone + trajectory + chips | Linescore + historical at-bat list; theater moved to Live |
| Box | Stub | Linescore + tables; venue/location after start |
| Recap | Stub | Linescore + long-form document |
| Search / Standings / Settings | Titles only | Per FEATURES; Settings by site area; no photo search grid |
| Wordmark | Fraunces title | Plex wordmark; no logo image required |

---

## 9. Open decisions

Brand, bans, team-color-without-logos, modular summary→detail, five tokens, **dark only**, **Live is the pitch theater**, **three host pairings**, **scoreboard slot + collapse non-favorites**, **Live/Recap phase presence**, **Settings by site area**, **Figma as a component library**, and **views-read-settings-directly** are **accepted**. Remaining:

| Decision | Status | Notes |
|----------|--------|-------|
| Color mode | **Accepted** | Dark only. No light mode, no `prefers-color-scheme` invert, no Light / Dark / System setting |
| Live is the pitch theater | **Accepted** | No standalone Pitch Theater. Live = status + pitcher/batter above zone + zone + trajectory + accordion. **No linescore on Live.** Pitch chips are out |
| Host pairings | **Accepted** | **mobile** (compact status, no linescore on Live) · **medium** (standalone) · **desktop** (medium + nav rail) |
| Game-row slot | **Accepted** | Right-aligned modular block. Occupant is a setting: status, room menu (tab link stack), win probability, … |
| Collapse non-favorites | **Accepted** | Setting: non-favorite games are a smaller bar by default. Favorites stay the full module. Off when the user has no favorites |
| Live / Recap presence | **Accepted** | Never both. Pre-game: neither. In progress: Live only. Final: Recap when available (Live hidden) |
| Linescore placement | **Accepted** | Plays · Box · Recap at every pairing. Never on Live |
| Scoreboard team line | **Accepted** | With scores: `NYY (91-71)`. Venue on list only pre-game |
| Pitch accordion default | **Accepted** | Newest at top; most recent expanded by default |
| Videos browse | **Accepted** | Responsive grid + list toggle; sort/filter chrome required; dimensions OPEN |
| Video MLBAM disclaimer | **Accepted** | Always under the player, verbatim |
| Settings grouping | **Accepted** | By site area (Game list · Game detail · Account), not preference type |
| Figma file | **Accepted** | Componentize first: variables for the five tokens, text styles, components + variants/properties, screens as instances. A change is made once |
| How strongly team color paints a module | **Open** | Edge/swatch/score vs larger fill; contrast is the constraint |
| No-spoilers for free-text titles | **Open (product)** | Structured scores ≠ video/recap title strings; FEATURES must say what to do with outcome-in-title copy |
| Mobile game room chrome | **Open** | Scrollable top tabs vs bottom bar — one choice for all `mobile` hosts |
| Videos sort / filter fields | **Open** | Tool chrome exists; exact dimensions TBD |
| Video: dialog vs persistent stage | **Open** | Either is fine if browsing stays typographic and the disclaimer is always shown |
| Letterform favicon | **Open** | No team marks |

---

## 10. How to use this doc

- New UI stories implement FEATURES acceptance criteria **and** this document. **This document overrides** older palette/logo/photo/media-query language anywhere it conflicts.
- If a backlog AC and this doc disagree, tighten both in the same change.
- Tokens live in a **minimal** root theme (`styles.css` + Mantine `createTheme`). Views use semantic roles; they do not name brand hexes.
- Host pairings are an API (`mobile` / `medium` / `desktop` via `variant` / `data-layout` / context). The default host may pick among those three from pane or viewport width.
- Settings that change presentation are specified in FEATURES. Views read them directly (§5a). No intermediate profile.
- **Designs come before UI code.** Each surface lives in `docs/v3/visual/<surface>/` — exported frames, a `DESIGN.md` recording the source and decisions, and a `RATIFIED.md` sealing them once the product owner ratifies. Later changes are ratified amendments under `amendments/`, never edits. UI stories build to those frames and cannot start until their design stories (S31–S34) are ratified (BACKLOG rule 18). This document stays the rules; the frames are the look.
- The Figma source is a **component library**: variables, text styles, components with variants/properties, screens assembled from instances (§7). Exports are snapshots of those instances, not separately drawn posters.

# Baseball Theater v3 — Visual Design

**Status:** Drafting (direction **accepted** for brand, chrome bans, and information shape)  
**Depends on:** [INTENT.md](./INTENT.md) (goals), [FEATURES.md](./FEATURES.md) (surfaces)  
**Implementation home:** `web/` (React + Vite + **Mantine 7**, ADR-008)  
**Not this doc:** stack, data topology, entitlements — those stay in [ARCHITECTURE](./ARCHITECTURE.md) and FEATURES.

This is the visual and interaction source of truth. FEATURES says *what users get*; this says *how it looks, sits on the page, and behaves*.

v2 remains a **capability menu**, not a look to copy. Sharing a primary red with the old site is fine; copying v2’s Material chrome, logo tiles, or photo cards is not.

The scaffold (`web/src/styles.css`, `App.tsx` theme) still uses an older night-park palette. **This document wins.** New UI work implements the tokens and rules below; leftover scaffold styles are debt.

---

## North star (visual)

A **modern 2026** public web app for superfans and statheads: scores, stats, videos, and the rest of the carried loop. **Simple and beautiful, full-featured, very intuitive.**

It should feel like the product already knows what you came for — scores you can read instantly, a path into every deeper cut (plays, box, video, recap), and nothing in the way. Summary views lead to detailed views. You can find everything you hope to find.

The UI is **tactile and modular**, not graphics-heavy. Controls and information do the work. No ads, no headline stack, no photographs, **no team logos**.

**View variant and screen size are separate axes.** Compact vs expanded (and any later variants) are properties of a **view**. Viewport width is a property of a **frame**. Hosts often pair them — a phone frame usually asks for compact — but that pairing is a choice, not an identity. A wide window may host a compact view; a narrow pane may host only what fits. **Viewport CSS media queries are not allowed to be what *is* a view’s variant.**

Each person can change **how the UI presents for them**. Those presentation settings are first-class and honored everywhere they apply — not one-off ifs on a single page.

---

## 1. Design goals

If a visual choice doesn’t serve one of these, cut it.

| # | Design goal | Serves | Means |
|---|-------------|--------|--------|
| D1 | **Exactly what you came for** | G5, north star | Information scent: the next click is obvious; search, standings, and game rooms are where you expect |
| D2 | **Simple and beautiful, full-featured** | G5 | Quiet chrome; density where numbers live; no feature hidden behind a “pro” aesthetic on the free surface |
| D3 | **Tactile, not graphic** | D2 | Buttons, modules, type, and team color — not illustration, photography, or decorative viz |
| D4 | **Summary → detail** | G5 | Every level is a complete view that opens a richer one (day → game → tab → at-bat → pitch) |
| D5 | **Highlights and game understanding first** | FEATURES principle 1 | Scoreboard is the lobby; a game is rooms (video / live / plays / box / recap), not a news page |
| D6 | **Insight is visible product** | G2, G4 | Impact order and inning notes are modules with rank/label — not a wall of equal rows |
| D7 | **Respect attention** | G5 | Live updates patch in place; motion is rare; presentation settings (spoilers, emphasis, entry room, …) are obeyed |
| D8 | **Patronage is power, not a lock screen** | G3 | Free experience is complete; paid depth is extra, not a greyed-out homepage |
| D9 | **Honest about data** | FEATURES principle 6 | Freshness and source are readable; we don’t costume ourselves as MLB.com |
| D10 | **Variant ⊥ viewport** | G5 | Design compact first (it is the tighter view, not “the mobile site”). The host *selects* a variant. Screen size may inform that selection; it does not define the view |
| D11 | **Presentation is personal** | Settings | Views read settings they care about (sort, default tab, color mode, …). Don’t invent a second store between settings and the view |

**D7** and **D11** are behavior rules and this document owns them. *How* the client is wired to honor them — one server read cache that live updates patch instead of replace, and a settings store views read directly — is [ARCHITECTURE ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted).

### Hard bans

| Ban | Meaning |
|-----|---------|
| **No ads** | No promo rails, sponsored modules, or leftover “for our patrons” interstitial on the homepage |
| **No headlines** | No news-site hero, ticker, or stack of article titles. Recap lives *inside* a game as a document module, not as the front door |
| **No photographs** | No player headshots, stadium stills, collage heroes, or photo thumbnails as card faces. **Playing a video is the product;** a still poster/frame is not the browsing language |
| **No team logos** | Never. Not in nav, scoreboard, standings, favicon-sized marks, or “logo or fallback.” Identify teams with **colors, names, cities, and abbreviations only** |
| **No decorative graphics** | No ambient blobs, park illustration, texture overlays, or motion backgrounds. Functional viz (strike zone, trajectory, diamond) is allowed because it *is* the data |
| **No viewport-as-variant** | Do not *define* compact ↔ expanded (or stack ↔ side-by-side, drawer ↔ rail) as a function of `@media (min-width)` / `max-width`. The **host** assigns the variant. Screen size is one input a host may use; it is not the view |

### What we are not

| Avoid | Why |
|-------|-----|
| Night-park / turf / clay atmosphere | Replaced by the brand tokens in §3 |
| Logo tiles, cap marks, photo cards | Banned above |
| MLB.com / ESPN clone | Differentiation (G2); also those sites are photo- and headline-led |
| Dashboard soup (every metric equally loud) | Full-featured ≠ everything visible at once; summary → detail |
| Graphics-heavy “broadcast package” | Tactile UI; type and modules |
| Mystery-meat icons without labels | Intuitive for statheads still means readable |
| A view that *is* “the desktop layout” or “the mobile layout” | Those are host pairings. The view only knows which variant it was given |
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
| **Game · Videos** | Watch what mattered | Highlights, impact-sorted; recap/condensed as list rows, not posters |
| **Game · Live** | Where the game is *right now* | Inning, count, bases, current sequence; later: inning insight feed |
| **Game · Plays** | Reconstruct an at-bat | Pitch list, strike zone, trajectory; later: Savant / multi-source |
| **Game · Box** | The ledger | Batting / pitching tables, linescore |
| **Game · Recap** | The story after | MLB editorial and/or BT game package — a document, not a headline |
| **Search** | Find a clip across days | Free-text + date/tag; typographic results |
| **Standings** | Season context | Division tables; team color + name/abbr, never marks |
| **Settings** | Edit the user’s settings; other views read those values | FEATURES owns *which* settings exist |

### Hierarchy of attention (inside a game)

1. **Who’s playing, what’s the state** — city/name/abbr, team color, score (or hidden), status  
2. **The current room** — list, zone, diamond, table, recap prose  
3. **Supporting evidence** — pitch chips, blurbs, source links, insight modules  

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
| Let light/dark invert grounds via the theme | Duplicate light and dark rules in every view |
| Exceptions only for **data** color (team accent, MLB pitch `ballColor`) | Treating every border and fill as a one-off |

If a view needs a new brand hue, that is a **theme change**, not a local style. Prefer fewer CSS variables and fewer overrides over a large token catalog.

| Token | Hex | CSS (theme root only) | Role |
|-------|-----|------------------------|------|
| **Primary** | `#CE0F0F` | `--bt-primary` | Brand, wordmark accent, primary actions, selected control, strike fallback |
| **Dark** | `#211819` | `--bt-dark` | Dark-mode ground; light-mode text and hairlines |
| **Light** | `#FFF2D3` | `--bt-light` | Light-mode ground; dark-mode text |
| **Accent** | `#F5AD1D` | `--bt-accent` | Impact, emphasis, “watch first,” warm highlight |
| **Accent 2** | `#72D991` | `--bt-accent-2` | Live, positive, in-progress, ball fallback |

Mantine `primaryColor` is a custom red scale anchored on **Primary**, not teal. Accents map into the theme the same way so components say `color="accent"` (or whatever the theme names), not a hex.

`theme-color` / browser chrome follows the **active** mode (`#FFF2D3` in light, `#211819` in dark).

### Modes

Both **light** and **dark** are first-class. Same five tokens; grounds invert **in the theme**, not per view.

| | Light | Dark |
|--|-------|------|
| Page | Light `#FFF2D3` | Dark `#211819` |
| Text | Dark `#211819` | Light `#FFF2D3` |
| Raised module | Light, slightly edged with Dark at ~12% | Dark, slightly edged with Light at ~12% |
| Primary / Accent / Accent 2 | Unchanged | Unchanged |

**Default (accepted):** follow the system (`prefers-color-scheme`). If the system does not provide a preference, use **dark**.

A color-mode setting may override that with Light, Dark, or System. House default is System (then dark if unknown). Mantine should use `defaultColorScheme="auto"` with a dark fallback — not a hard-coded light or dark lock. Scaffold `defaultColorScheme="dark"` is incomplete until it reads the system.

A setting may **re-tint** chrome from a team color the user chose. That is a theme overlay (primary/accent shift), not local hex on each view, and not a logo. Contrast rules still apply.

Do not add extra page gradients. Flat grounds; modules separate with theme borders, not drop shadows and glow.

### Semantic color

Meaning lives in the theme. Views pick a **role** (primary, live, muted), not a paint chip.

| Meaning | Theme role | Notes |
|---------|------------|--------|
| Brand / CTA / selected | Primary | Also strike fallback when MLB `ballColor` is missing |
| Live / in progress | Accent 2 | Small live dot + label; module does not throb |
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
- Team color is a **structural accent** (edge, swatch, score numeral, underline) — enough to read “who” at a glance. It is not a full-bleed page theme and must **contrast** on Light and Dark grounds. If a team color fails contrast, darken/lighten a derived value at the data/theme boundary; do not fall back to a logo.
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

## 5. Layout — variants divorced from screen size

The layout system is **modules** plus an explicit **layout variant**. Screen size is not a variant.

A **module** is a bounded region with one job (one game, one linescore, one at-bat, one table). Opening a module (or a row inside it) is how you go from summary to detail.

### Two axes (accepted)

| Axis | What it is | What it is not |
|------|------------|----------------|
| **View variant** (`compact`, `expanded`, …) | How *this* view arranges its modules | “Mobile” or “desktop” |
| **Frame / screen size** | How much space a host has, and (optionally) what variant it *asks for* | The identity of the view |

They are **used together** — a host on a phone will usually pass `compact` — and they are **not intrinsic**. Nothing in a view may assume “I am compact because the window is narrow.”

Design every surface in **compact** first (tighter arrangement, thumb-reach chrome). Then **back-design** **expanded** as more room for the *same* modules. Expanded is not a second product and not “the desktop site.”

| Variant | Intent | A host *might* pair it with |
|---------|--------|-----------------------------|
| **`compact`** | Single column, stacked rooms; usable in a ~320–420px-wide **pane** (the pane is not required to be the window) | Phone frame; a sidebar; a split; a user-pinned pane |
| **`expanded`** | Same modules, more columns / parallel rooms | Full-width main; a wide pane — including on a large phone if a host chooses |

The **host** (route, split, presentation setting, or a size-aware wrapper) **passes the variant in**. Illustrative pairings — not features to build up front:

- Phone frame → `compact` on whatever it shows
- Wide main canvas → `expanded` scoreboard
- Wide window + a game pane → main `expanded`, game `compact` (one place two variants coexist)

```text
Example pairing (not a breakpoint, not a required chrome)

┌─ Frame (any width) ─────────────────────────────────┐
│  ┌─ View A (expanded) ───┐  ┌─ View B (compact) ─┐  │
│  │ host chose expanded   │  │ host chose compact │  │
│  └───────────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### What may not drive layout

| Not allowed | Why |
|-------------|-----|
| `@media (min-width)` / `max-width` on the **viewport** *being* compact ↔ expanded | Screen size is not the variant |
| Mantine `hiddenFrom` / `visibleFrom` / `useMediaQuery` as the layout brain | Those bind the view to the window |
| `Foo.mobile.tsx` vs `Foo.desktop.tsx` as the variant | Those names smuggle screen size into the view |

| Allowed | Why |
|---------|-----|
| A `variant` prop, data attribute, or context (`data-layout="compact"`) | Host is explicit |
| CSS that *styles* `[data-layout="compact"]` vs `expanded` | Variant is already chosen |
| **Container queries on the host pane** (`@container`) | A *host* may use pane size to *decide* which variant to pass. The view still only sees the variant |
| Flex/grid wrap *inside* a variant for leftover crumbs | Wrapping chips is not a second layout system |

Scaffold `AppShell` `navbar.breakpoint: "sm"` is **debt** — chrome open/collapsed must become a variant (or a presentation setting), not a media query.

### Shell

Mantine `AppShell` stays as chrome, not as a content metaphor.

| Region | Compact | Expanded |
|--------|---------|----------|
| Header | 56–64px; burger / wordmark / account | Wordmark + date + search + account |
| Nav | Overlay drawer, or a compact rail the host opens | Persistent ~240px rail |
| Main | One column of modules | Module canvas; a host may place more than one view, each with its own variant |

**Nav items (MVP):** Scoreboard · Standings · Search · Settings. No Featured Videos, no team-logo rail. If settings emphasize teams, those are compact **color + abbr** rows under the primary links.

Drop `v3 · local fixtures` on public builds.

**Footer:** optional, quiet — copyright / report a problem. Not a second nav, not headlines.

### Scoreboard (summary)

- Date control (prev / today / next / picker) first — not buried.
- Quiet meta: date, window mode, last fetched (D9).
- Each game is a **module-as-link** (whole module clickable).
- Anatomy: away (color, city/abbr) · score · home (color, city/abbr) · status · venue/time. **No logo, no photo, no headline.**
- **Compact:** one column of game modules. **Expanded:** 2–3 columns of the *same* module — not a different card.
- Order and emphasis follow **settings** when those settings exist. Score *fields* can hide; title strings are not the same problem (§5a).

### Game (detail)

Design the **compact** game first: header + room switcher + one room. **Expanded** is the same rooms with more parallel modules. Which variant you see is whatever the host passed — not “mobile vs desktop.”

- Back control returns to the host (that day’s scoreboard, or dismiss this view), not a generic home.
- Header module: both teams (color + city/name/abbr), status, score (structured field — hideable when that setting exists).
- Room switcher in the URL when the game is the main route (`/game/:gamePk/:tab`). Another host may keep room state locally or still sync the URL — **open** (§9). The chrome follows **variant**, not the route.

**Compact room chrome:** pick **one** — scrollable top tabs *or* a bottom bar — and use it for every `compact` game, wherever it is hosted. Not both. **Open** (§9).

**Expanded game:** same header + rooms; may place two modules side by side (e.g. live diamond + insight, zone + trajectory). Extra room, not a different IA.

Tab order: **Videos · Live · Plays · Box · Recap**. Which room opens first is a **presentation setting**, not a design-doc default.

| Tab | Compact | Expanded (same modules) |
|-----|---------|-------------------------|
| Videos | Ranked typographic list | Same list; optional wider row |
| Live | Linescore + count/bases + plays, stacked; insight below | Insight may sit beside live, if the host is expanded |
| Plays | Accordion; pitch theater stacked (zone then trajectory) | Zone beside trajectory |
| Box | Team switcher (color + name); one table at a time | Away/home may sit side by side |
| Recap | Long-form document | Same document, wider measure |

### Pitch theater (detail of an at-bat)

Functional viz — allowed. Keep it sparse: lines, dots, type. No park illustration behind the zone.

```text
compact                          expanded
┌─ matchup / result ─┐           ┌─ matchup / result ──────────────┐
│ zone (stacked)     │           │ zone          │ trajectory      │
│ trajectory         │           │               │                 │
│ chips (scroll)     │           │ chips (scroll)                  │
└────────────────────┘           └─────────────────────────────────┘
```

Zone ~220×280. Chips scroll horizontally in both variants. Stack vs side-by-side is **variant**, not viewport width.

### Search, Standings, Settings

Search results: **typographic rows** (title, date, teams as color + abbr) — not a photo gallery. Standings: tables with color + name/abbr. Settings: grouped presentation controls + account (see §5a). All three have compact and expanded hosts.

### Density (inside a variant)

| Context | Density |
|---------|---------|
| Scoreboard, video lists | Comfortable hit area |
| Box, standings | Compact — numbers first |
| Pitch chips, live play list | Compact, clear selected state |
| Recap, insight prose | Roomy |

`defaultRadius: "md"` — modules feel like objects you can press. The strike zone is the sharp-line exception.

---

## 5a. Settings that change presentation

Users will have settings that change **how the same views look** (favorites sort, default game tab, light/dark, …). FEATURES and the backlog decide *which* exist.

**Rule:** views read those settings directly. There is no extra object between settings and the view. Don’t invent a second store that settings write and views read.

Settings are their own kind of state, separate from the server read cache — see [ADR-014](./ARCHITECTURE.md#adr-014--client-state-management-accepted).

### Settings view

- Group controls by what they change (“How it looks”, “What is hidden”, “What opens first”)
- Plain labels; changing a control updates the UI **without a reload**
- Persist however FEATURES says (local first is fine)
- Compact Settings is one scrolling column; expanded may use two columns of the same groups

### When you build a view

| If a setting can… | Do this in the view |
|-------------------|---------------------|
| Change order / emphasis | Sort/weight from the setting. Don’t bake one order into the page |
| Choose the first game tab | Open the tab the setting names. Don’t hardcode Videos |
| Switch light / dark | Tokens already invert (§3). Default is System, then dark if the OS has no preference |
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
- Close the compact nav drawer on navigate.
- Opening a game is a host decision: replace the frame, or add another view. The game view’s variant is assigned independently of how wide the window is.
- Keyboard: visible focus. Pitch chips and zone dots are buttons; arrow keys between pitches when Plays is polished.

### Scoreboard

| Action | Behavior |
|--------|----------|
| Open game | Host chooses how to place the game view and which variant to give it; entry **room** comes from settings (Videos if unset) |
| Change date | `/games/:date`; remember last date for the session |
| Hover / focus | Border/contrast; optional 160ms lift — no bounce, no glow wash |
| Live | Accent 2 dot + label |
| Structured score hidden | Score *fields* follow the setting; card size stays stable. Free-text titles need their own rule (§5a) — blanking numerals is not enough |

### Live updates (BT-backed)

- Patch in place: scores, inning, lists. Do not remount or steal focus from an open at-bat.
- Quiet last-updated. No countdown “update bar.”
- Game final: status changes; no modal.

### Game tabs

- Route change (shareable).
- Empty rooms stay in the bar (stable IA) with one sentence, not a missing tab.
- Entry room comes from settings. The house fallback (when unset) is Videos.

### Videos

- A row is the control: title, duration, impact mark. Click plays **in-app** (settings may allow external).
- Queue: previous / next; autoplay from settings.
- Default sort: impact; caption “Impact-sorted” is enough honesty.
- Space play/pause; Esc closes a dialog if we use one.
- **Do not** use photo posters as the browsable surface.

### Plays / pitch theater

| Action | Behavior |
|--------|----------|
| Expand at-bat | Accordion; default **last** while live, **first** (or scoring) when final — see §9 |
| Click zone dot or chip | Selects that pitch; stops animation |
| Animate pitch | Explicit control; reduced motion → path only, no flight |
| Missing location | Copy; chips still work |

Tooltips are extra; chips carry the same facts.

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
| Slow live-dot opacity | Module throb, staggered entrances |
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

| Pattern | Use |
|---------|-----|
| `Card` (module) | Scoreboard games, at-bat header, insight notes |
| `Badge` | Status, pitch count, result, impact — color from §3 |
| `Tabs` | Game rooms |
| `Accordion` | Play list |
| `NavLink` | Shell |
| `Table` | Box, standings |
| Custom SVG / Box | Strike zone, trajectories, bases — geometry, not illustration |

**Impact / insight:**

- Impact: Accent rank (`1`, `2`, `3`) or a “Watch first” marker.
- Notable-but-low-leverage: muted badge (“Notable”).
- Inning insight: stacked modules with inning label; append-only; don’t jump the reader.
- Source chips (MLB · Savant · FG · BBRef): type only; new tab.

**Video rows:** duration as type, Primary play control, Accent for impact. Recap/condensed are labels on the same row species — not a different graphic object.

**Favicon / PWA icon (if any):** letterform or simple Primary mark — **not** a team logo, **not** a photo.

---

## 8. Scaffold vs this spec

New UI work moves to the right column. Do not “fix” pages by reintroducing logos, photos, teal, or turf gradients.

| Area | Scaffold now | Target |
|------|----------------|--------|
| Palette | Field / clay / chalk + teal | Five tokens in theme only; views use roles, not hex |
| Color mode | Hard-coded dark | Light + dark; default **system**, else **dark** |
| Type | Fraunces headings + Plex | Plex everywhere |
| Team identity | Text abbr only | **Colors + city + name + abbr; never logos** |
| Media chrome | (none) | Video as rows + player; **no photos** |
| Shell | Header + sidebar; navbar `breakpoint: "sm"` | Variant-driven chrome; compact nav works in a narrow pane |
| Layout | Viewport-ish grid (`sm` 2-col) | Variant assigned by host; not derived from window width |
| Presentation | None | Views read settings when those settings exist |
| Scoreboard | 2-col cards, no date control | Date controls; same module in 1- or n-col by variant |
| Game header | Matchup + score | Team color; score can hide without the header collapsing |
| Game tabs | Five tabs, some stubs | Same IA per variant, regardless of frame; fill rooms |
| Videos | Title list | Ranked typographic list + player |
| Plays | Zone + trajectory + chips | Keep as functional viz; keyboard; reduced motion |
| Search / Standings / Settings | Titles only | Per FEATURES; no photo search grid |
| Wordmark | Fraunces title | Plex wordmark; no logo image required |

---

## 9. Open decisions

Brand, bans, team-color-without-logos, modular summary→detail, five tokens, **variant ⊥ viewport**, and **views-read-settings-directly** are **accepted**. Remaining:

| Decision | Status | Notes |
|----------|--------|-------|
| Color mode default | **Accepted** | System (`prefers-color-scheme`); **dark** if the system has no preference. Profile may lock Light / Dark / System |
| How strongly team color paints a module | **Open** | Edge/swatch/score vs larger fill; contrast is the constraint |
| No-spoilers for free-text titles | **Open (product)** | Structured scores ≠ video/recap title strings; FEATURES must say what to do with outcome-in-title copy |
| Compact game room chrome | **Open** | Scrollable top tabs vs bottom bar — one choice for all `compact` hosts |
| How a host pairs frames and variants | **Open** | Pairing is allowed (e.g. wide window + compact game pane). Default pairing can wait; the axes must stay separate from the first view |
| Default open at-bat | **Proposal** | Last while live; first (or scoring filter) when final |
| Video: dialog vs persistent stage | **Open** | Either is fine if browsing stays typographic, not posters |
| Letterform favicon | **Open** | No team marks |

---

## 10. How to use this doc

- New UI stories implement FEATURES acceptance criteria **and** this document. **This document overrides** older palette/logo/photo/media-query language anywhere it conflicts.
- If a backlog AC and this doc disagree, tighten both in the same change.
- Tokens live in a **minimal** root theme (`styles.css` + Mantine `createTheme`). Views use semantic roles; they do not name brand hexes.
- Layout variants are an API (`variant` / `data-layout` / context), not a stylesheet that watches the window.
- Settings that change presentation are specified in FEATURES. Views read them directly (§5a). No intermediate profile.
- **Designs come before UI code.** Each surface is designed by the product owner and lives in `docs/v3/visual/<surface>/` — exported frames, a `DESIGN.md` recording the source and decisions, and an `APPROVAL.md` the owner commits. UI stories build to those frames and cannot start until their design stories (S31–S34) are approved (BACKLOG rule 18). This document stays the rules; the frames are the look.

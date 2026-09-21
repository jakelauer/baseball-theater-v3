Design a modern 2026 public web app called Baseball Theater (baseball.theater).

PRODUCT
Baseball Theater is where superfans and statheads go for highlights, live game context, and insight you cannot get from a raw MLB feed. Scores you can read instantly. A path into every deeper cut (plays, box, video, recap). Nothing in the way.

North star: simple and beautiful, full-featured, very intuitive. The product already knows what you came for. Summary views lead to detailed views. You can find everything you hope to find.

Audience: baseball superfans and statheads. Not casual sports-news readers. Not a broadcast package. Not MLB.com or ESPN.

Carried loop (this is the whole app for MVP):
Scoreboard → Game (rooms: Videos / Live / Plays / Box / Recap) → Search → Standings → Settings.

New product themes that must be VISIBLE in the UI language (not a second app):
- Impact curation: “watch first” ranking, not a wall of equal highlight rows
- Inning insight feed: labeled note modules that append, not a chat
- Day digest / “best of” as a summary module on the scoreboard lobby (show the slot even if content is placeholder)
- Multi-source links as typographic chips (MLB · Savant · FanGraphs · BBRef) — type only, no site logos
- AI / insight as attributed, quiet modules — not neon, not a chatbot overlay
- Patronage is power, not a lock screen: the free homepage is complete. Paid depth is extra. Never a greyed-out homepage or “for our patrons” interstitial.

DESIGN GOALS (every visual choice must serve one of these; if it does not, cut it)
D1  Exactly what you came for — information scent; next click is obvious; search, standings, and game rooms are where you expect
D2  Simple and beautiful, full-featured — quiet chrome; density where numbers live; no feature hidden behind a “pro” aesthetic on the free surface
D3  Tactile, not graphic — buttons, modules, type, and team color do the work. Not illustration, photography, or decorative viz
D4  Summary → detail — every level is a complete view that opens a richer one (day → game → tab → at-bat → pitch)
D5  Highlights and game understanding first — scoreboard is the lobby; a game is rooms, not a news page
D6  Insight is visible product — impact order and inning notes are modules with rank/label, not a wall of equal rows
D7  Respect attention — live updates patch in place; motion is rare; presentation settings (spoilers, emphasis, entry room) are obeyed
D8  Patronage is power, not a lock screen
D9  Honest about data — freshness and source are readable; we do not costume ourselves as MLB.com
D10 Variant ⊥ viewport — compact vs expanded is a property of a VIEW. Screen size is a property of a FRAME. Do not design “the mobile site” vs “the desktop site.” Compact is the tighter arrangement of the same modules, usable in a ~360px-wide pane. Expanded is more room for those same modules (more columns / parallel rooms). A wide window may host a compact view.
D11 Presentation is personal — views honor settings (sort, default tab, color mode, hide scores). Do not bake one order or one first-tab into the page.

HARD BANS (never appear in any frame)
- No ads, promo rails, sponsored modules, or patron interstitials
- No headlines, news-site hero, ticker, or stack of article titles. Recap lives INSIDE a game as a document, not as the front door
- No photographs: no player headshots, stadium stills, collage heroes, poster thumbnails, or photo cards. Playing a video is the product; a still poster is not the browsing language
- No team logos. Never. Not in nav, scoreboard, standings, favicon, or “logo or fallback.” Identify teams with official colors + city + name + abbreviation only
- No decorative graphics: no ambient blobs, park illustration, turf/clay/night-park atmosphere, texture overlays, motion backgrounds, drop shadows, glow
- No MLB.com / ESPN clone energy
- No dashboard soup (every metric equally loud)
- No mystery-meat icons without labels
- No Fraunces / serif masthead / editorial magazine look
- No teal as brand. No night-park green. No clay orange as brand.

WHAT WE ARE
A tactile, modular tools-and-numbers product. Raised modules feel like objects you can press (medium corner radius). Controls and information do the work. Flat grounds. Modules separate with hairline borders (~12% of the opposite ground), not shadows.

THEME — exactly five brand tokens. No other brand hues.
Primary    #CE0F0F   brand, wordmark accent, primary actions, selected control, strike fallback, errors-as-copy
Dark       #211819   dark-mode page ground; light-mode text and hairlines
Light      #FFF2D3   light-mode page ground; dark-mode text (warm cream, not white)
Accent     #F5AD1D   impact, emphasis, “watch first,” warm highlight
Accent 2   #72D991   live / in-progress / positive / ball fallback

Color modes (both first-class; generate BOTH):
Light: page Light #FFF2D3, text Dark #211819, raised module Light edged with Dark at 12%
Dark:  page Dark #211819, text Light #FFF2D3, raised module Dark edged with Light at 12%
Primary / Accent / Accent 2 do not change between modes.
Default follows system; if unknown, dark. Do not add page gradients.

Semantic color (meaning, not paint):
- Brand / CTA / selected = Primary
- Live / in progress = Accent 2 small dot + label. Module does not throb.
- Preview / scheduled = muted text; time is the data
- Final = muted text. NOT Primary. Red is brand and strikes, not “game over.”
- Impact / watch first = Accent rank (1, 2, 3) or “Watch first” marker
- Insight / AI = muted + label (or soft Accent 2). Attributed. Not neon.
- Out / retired = muted
- Structured score hidden = muted; no numerals; card size stays stable

Team colors are DATA, not a second stylesheet.
On a game module, away and home each own a side: color bar or edge, name/abbr, score. Do not merge both palettes into one background wash. Team color is a structural accent (edge, swatch, score numeral, underline) — enough to read “who” at a glance. It is not a full-bleed page theme and must contrast on both Light and Dark. If a team color fails contrast, derive a darker/lighter value — never fall back to a logo.

Example matchup to use everywhere (realistic, not placeholder lorem):
Away: New York Yankees  NYY  navy #0C2340  score 5
Home: Boston Red Sox    BOS  red #BD3039   score 3
Also include 1–2 other games on the slate (e.g. LAD @ SD, CHC @ MIL) so a day-of-games lobby feels real.

TYPOGRAPHY
One family for everything: IBM Plex Sans, weights 400 / 500 / 600 / 700.
Wordmark: the words “Baseball Theater” in Plex semibold/bold. Primary on the word “Theater” OR a Primary underline. Not a logo image. Not a serif masthead.
Scores (revealed): extra-large, heavy, tabular nums.
Matchup: abbreviation first for glance (NYY @ BOS); city + name as secondary.
Meta (venue, date, last fetched): small, muted.
Tables: tabular nums.
Recap prose: body size, roomier line-height. Recap title is a document title, not a homepage headline.

LAYOUT SYSTEM
Design every surface in COMPACT first (single column, stacked rooms, thumb-reach chrome, ~360–390px pane). Then back-design EXPANDED as the same modules with more columns / parallel rooms (~1280px canvas).
These are view variants assigned by a host — not breakpoints, not “mobile vs desktop.”
Show at least one frame where BOTH variants coexist in one wide window: expanded scoreboard on the left, compact game pane on the right. Label the frame “host pairing — not a breakpoint.”

Shell
Nav items only: Scoreboard · Standings · Search · Settings. No Featured Videos. No team-logo rail.
If favorites exist, they are compact color + abbr rows under the primary links — not marks.
Compact: 56–64px header (burger / wordmark / account); nav is an overlay drawer or compact rail.
Expanded: wordmark + date + search + account; persistent ~240px nav rail.
Footer optional and quiet (copyright / report a problem). Not a second nav.
Include a global notice slot at the top of the shell (quiet banner, dismissible) — used later for an upgrade prompt. Not an ad.

COMPONENT LANGUAGE
Raised cards/modules, badges, tabs, accordion, tables, nav links.
Custom geometry only for baseball tools: strike zone, pitch trajectory, diamond / bases — sparse lines, dots, type. No park illustration behind the zone.
defaultRadius medium. Strike zone is the sharp-line exception.
Density: comfortable hit area on scoreboard and video lists; compact on box/standings/pitch chips; roomy on recap/insight prose.

MOTION (show as annotation, do not animate the file)
Allowed: 160ms border/lift on hover of a game module; slow live-dot opacity; user-started pitch flight.
Disallowed: auto-animating lists, parallax, gradient motion, module throb, staggered entrances, springy overshoot.

STATES TO DESIGN (not just the happy path)
Loading: centered spinner; keep the page title.
Error: short Primary-colored copy + recovery hint. No stack traces.
Empty: one muted sentence.
Live: Accent 2 dot + label; scores/inning patch in place.
Final: status changes; no modal.
Hide scores: structured score fields blanked, card size stable. Do not blank the whole card.

REALISTIC COPY (use this, not lorem)
Date: Sep 21, 2026. Quiet meta: “In-window · Fetched 12s ago”
Yankees at Red Sox, Fenway Park, Final (and a second live game: “Bot 7 · 2–1”)
Video rows (typographic, no posters):
  1  Judge 447-ft go-ahead HR  ·  0:48  ·  Watch first
  2  Devers tying double  ·  0:36
  3  Also interesting: filthy 99 mph backdoor  ·  Notable
Live insight note: “Inning 6 — Judge’s HR flipped win probability; bullpen door already open.”
Search result: typographic row, title + date + NYY/BOS color+abbr
Standings: AL East table, color swatch + name/abbr, W-L, GB. No logos.
Settings groups: “How it looks” (Light / Dark / System; team tint) · “What is hidden” (hide scores) · “What opens first” (default game room: Videos) · Account (Sign in with magic link or passkey; Connect Patreon as a secondary row)

SCREENS TO GENERATE
Produce a design-system page plus exploration frames. For every screen, generate compact AND expanded, and at least one light AND one dark of that screen.

Set A — App shell + scoreboard (the lobby)
- Shell chrome with nav, wordmark, account, notice slot
- Scoreboard: date control (prev / today / next / picker) FIRST, not buried
- Game modules-as-links. Anatomy: away (color, city/abbr) · score · home (color, city/abbr) · status · venue/time. No logo, no photo, no headline.
- Compact: one column of game modules. Expanded: 2–3 columns of the SAME module
- States: scheduled, live, final, empty day, loading, error, scores hidden
- Optional “Best of Sep 21” digest module on the lobby — ranked typographic rows, not a video grid

Set B — Game header, room chrome, Videos, player
- Game header: both teams (color + city/name/abbr), status, score (one frame shown, one frame hidden)
- Back control returns to the day’s scoreboard
- Room switcher. Tab order: Videos · Live · Plays · Box · Recap. Empty rooms stay in the bar with one sentence.
- EXPLORE two compact room-chrome options as labeled alternatives (pick one later): (1) scrollable top tabs  (2) bottom bar. One choice must eventually win for every compact host.
- Videos: ranked typographic list + “Impact-sorted” caption. Row = title, duration, impact mark, Primary play control. Recap/condensed are labels on the same row species.
- EXPLORE two player options as labeled alternatives: (1) dialog  (2) persistent stage. Browsing stays typographic in both — never posters.

Set C — Live, Box, Recap, Plays / pitch theater
- Live compact: linescore + count/bases + plays stacked; insight modules below
- Live expanded: insight may sit beside live
- Box compact: team switcher (color + name), one table at a time
- Box expanded: away/home tables may sit side by side
- Recap: long-form document, not a headline stack
- Pitch theater: matchup/result, strike zone ~220×280, trajectory, horizontal scrolling pitch chips
  Compact: zone stacked over trajectory. Expanded: zone beside trajectory. No park illustration.

Set D — Standings, Search, Settings
- Standings: division tables, color + name/abbr
- Search: free-text + date/tag filter chips; typographic results (title, date, teams as color+abbr) — not a photo gallery
- Settings: grouped presentation controls; compact = one scrolling column; expanded = two columns of the same groups; changing a control should look live (no “Save” as the hero)

EXPLORATION (do this — do not pick a single look and polish it)
Generate 3 distinct directions that ALL obey the bans, tokens, type, and goals. Vary only what is still open:
1. How strongly team color paints a module — quiet edge/swatch vs larger fill vs score-numeral-as-color. Contrast is the constraint. Label each.
2. Compact game chrome — top tabs vs bottom bar
3. Video player — dialog vs persistent stage
4. Letterform favicon / simple Primary mark (not a team mark, not a photo)
5. Density: slightly airier modules vs tighter stathead density — both still tactile

Do not explore: adding photos, logos, headlines, ads, serif wordmarks, teal, night-park, or a news homepage. Those are rejected, not variants.

OUTPUT
Figma frames named like: scoreboard-live-compact-dark, game-header-hidden-score-expanded-light, videos-compact-light, live-compact-dark, box-expanded-light, recap-compact-light, plays-pitch-theater-expanded-dark, standings-compact-light, search-expanded-dark, settings-compact-light, shell-notice-compact-light, host-pairing-scoreboard-expanded-plus-game-compact.
Use Auto Layout. Components for: game module, video row, insight note, team identity (swatch + abbr + name), nav item, pitch chip.
Include a Tokens page listing the five hex values, type roles, and the bans as a sticky “never” list.

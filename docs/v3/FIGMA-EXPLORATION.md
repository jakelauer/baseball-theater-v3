You are reviewing this in-progress Figma for Baseball Theater v3 (baseball.theater).
Score the frames that exist against the requirements below. Do not redesign. Do not praise. Do not invent requirements that are not listed. Incomplete work is fine — mark missing screens MISSING; do not fail the whole file for work not started.

SOURCE OF TRUTH (accepted)
Modern 2026 public web app for superfans and statheads. Simple and beautiful, full-featured, very intuitive. Tactile and modular — buttons, modules, type, and team color do the work. Scoreboard is the lobby. A game is rooms (Videos · Live · Plays · Box · Recap), not a news page. Live *is* the pitch theater (zone, trajectory, accordion pitch list) plus game status — not a separate Pitch Theater section. Summary → detail (day → game → tab → at-bat → pitch). Free homepage is complete; patronage is extra, not a lock screen.

Carried loop only: Scoreboard → Game rooms → Search → Standings → Settings.
New themes land INSIDE those rooms: impact ranking, inning insight notes, day digest / “best of”, multi-source type chips (MLB · Savant · FanGraphs · BBRef), quiet attributed AI/insight. Not a second app. Not a chatbot overlay.

HOW TO SCORE
For every checklist item, give exactly one of:
  PASS     — present and correct on the frames that exist
  FAIL     — a frame violates the rule (cite frame name + what is wrong + the smallest fix)
  MISSING  — no frame yet shows this; not a fail
  N/A      — cannot apply (e.g. hide-scores on a Settings-only file)
  OPEN     — a decision still being explored; fail only if the file treats one option as the only look without labeling it as an alternative, or if it picks a rejected direction (photo-led chrome, logos, headlines, ads, serif wordmark, teal, night-park, news homepage, light mode, standalone Pitch Theater, pitch chips as the Live sequence)

Then a one-line verdict: STOP (any hard-ban FAIL) / REVISE (other FAILs) / CONTINUE (only MISSING / OPEN / PASS).

List FAILs first, then OPEN items the file should still show as labeled alternatives, then MISSING screens/states. Do not list PASSes unless asked.

HARD BANS — any FAIL is a stop
B1  No ads, promo rails, sponsored modules, or “for our patrons” interstitial on the homepage
B2  No news-site hero, ticker, or stack of article titles. Recap lives inside a game as a document, not the front door
B3  No photo-led chrome: no news heroes, stadium stills, collage heroes, promo photos, or poster/thumbnail cards as browsing surfaces. Video browsing is typographic rows. Playing video is the product; a still poster is not the browsing language. PASS small functional player headshots (pitcher / batter on Live, similar inline marks). FAIL a layout that sells with large images
B4  No team logos. Never. Not nav, scoreboard, standings, favicon, or “logo or fallback.” Teams = official colors + city + name + abbreviation only
B5  No decorative graphics: no ambient blobs, park illustration, turf/clay/night-park atmosphere, texture overlays, motion backgrounds, drop shadows, glow
B6  No MLB.com / ESPN clone energy (photo- and headline-led)
B7  No dashboard soup — every metric equally loud
B8  No mystery-meat icons: non-standard / product-specific icons need a visible label. Universally understood chrome may be icon-only (hamburger/menu, search, account/user, help `?`, header ← back). Accessible names still required. FAIL a custom glyph with no label
B9  No Fraunces / serif masthead / editorial magazine look
B10 No teal as brand. No night-park green. No clay orange as brand
B11 No extra pairings. Only these three host pairings, named mobile / medium / desktop in the file:
      mobile   compact game status; no box score on Live
      medium   standalone game (no app nav rail)
      desktop  the medium game plus the persistent nav rail
    Desktop is not a third arrangement of Live modules. FAIL a frame that invents phone / tablet / web / compact / expanded as extra products, or that rearranges desktop Live differently from medium except for the rail.
B12 No one-off copies of a recurring object. If a game row, header, nav, wordmark, room tab, video row, accordion row, slot, or collapsed bar appears on more than one frame, it is a component instance (or a nested instance). FAIL two frames that each hold a detached duplicate of the same object — smallest fix: make one component and instance it

FILE — componentize first. Screens are assemblies of instances. A change is made once.
F1  The five brand tokens are Figma color variables (Primary, Dark, Light, Accent, Accent 2). Type roles are text styles (or variables). Frames bind to those — they do not paint local hex or a second Plex style. MISSING if the variables/styles do not exist yet; FAIL a drawn frame that ignores them
F2  Recurring UI is a component with variants or properties: game row (full / collapsed), right-hand slot (status / room menu / win probability), header (← back), nav / rail, room tabs, video row, pitch accordion (collapsed / expanded), wordmark, tooltip (closed / open)
F3  Host pairings reuse those components. Desktop is medium instances plus the rail instance — do not redraw Live (or the scoreboard module) as a third master
F4  Slot occupants and compact/expanded states are component variants or properties, not separately drawn masters that will drift
F5  Prefer variables + component properties over hidden/shown layers copied per frame. If you change a token or a component, every instance updates — that is the test
F6  A library page (or the variables panel) is the tokens page: five hexes, type roles, a “never” list. Screens do not restyle by hand

THEME — exactly five brand tokens
T1  Only these brand hues (team colors and MLB pitch ballColor are data, not brand):
      Primary  #CE0F0F  brand, wordmark accent, primary actions, selected, strike fallback, error copy
      Dark     #211819  page ground (the only page ground)
      Light    #FFF2D3  text and hairlines (warm cream, not white) — never a page ground
      Accent   #F5AD1D  impact, “watch first,” warm highlight
      Accent 2 #72D991  live / in-progress / positive / ball fallback
T2  Light is a token, not a mode: text and hairlines only. Never a page ground
T3  Dark only: page Dark, text Light, raised module Dark edged with Light at ~12%
T4  Primary / Accent / Accent 2 do not shift
T5  No page gradients. Flat grounds. Modules separate with hairline borders, not shadows
T6  Dark only. FAIL if a frame uses Light as page ground or presents a light-mode alternative as product. Do not draw a second mode
T7  Semantic color:
      Brand / CTA / selected = Primary
      Live / in progress = Accent 2 **blinking dot** + status label (e.g. LIVE or Bot 7); **no colored background / pill behind the label**; module does not throb
      Scheduled / preview = muted; time is the data
      Final = muted — NOT Primary (red is not “game over”)
      Impact = Accent rank (1, 2, 3) or “Watch first”
      Insight / AI = muted + label (or soft Accent 2), attributed, not neon
      Hide scores = muted, no numerals, card size stable
T8  Team color is a structural accent (edge, swatch, score numeral, underline). Away and home each own a side. No merged two-team background wash. No full-bleed page tinted with a team. Contrast on the Dark ground; if a team hex fails, derive a darker/lighter value — never a logo
T9  Wordmark is the words “Baseball Theater” in IBM Plex Sans semibold/bold. Primary on “Theater” OR a Primary underline. Not a logo image

TYPE
Y1  IBM Plex Sans only (400/500/600/700). No second display face
Y2  Scores (revealed): extra-large, heavy, tabular
Y3  When a team shows with a score: primary line is abbr + season record — `NYY (91-71)` — not city + full name as the scoreboard subheader. City/full name may appear only where scores are not the focus (e.g. scheduled pre-game if needed). Matchup shorthand stays abbr-first (`NYY @ BOS`)
Y4  Meta (venue, date, last fetched): small, muted
Y5  Tables: tabular nums
Y6  Recap title is a document title, not a homepage headline

DESIGN GOALS — fail a frame that fights these
D1  Next click is obvious; search, standings, game rooms sit where expected
D2  Quiet chrome; density where numbers live; free surface is not a “lite” aesthetic
D3  Tactile, not graphic — no illustration/decorative viz or photo-led layouts (functional strike zone / trajectory / diamond and small player headshots are allowed)
D4  Every level is a complete view that opens a richer one
D5  Scoreboard is the lobby; game is rooms, not a news page. Live is the pitch theater — do not keep a standalone Pitch Theater section
D6  Impact order and inning notes have rank/label — not a wall of equal rows
D7  Motion is rare (annotate 160ms lift, **live-indicator blinking dot**, user-started pitch flight only). No auto-animating lists, parallax, module throb, staggered entrances. Live status has **no** colored background/pill — only the blinking Accent 2 dot + label
D8  Free homepage complete; no greyed-out or gated lobby
D9  Freshness and source are readable (“In-window · Fetched …”). We do not costume as MLB.com
D10 Host pairings are mobile / medium / desktop as in B11. Mobile Live uses compact status and omits box. Medium is standalone. Desktop = medium + nav rail. Not a second product
D11 Settings that change presentation are visible as themselves (sort, default tab, hide scores, game-row slot, collapse non-favorites) — do not bake one order, one slot occupant, or every row as the full module. No color-mode control — the product is dark only

SHELL + IA
S1  Nav items only: Scoreboard · Standings · Search · Settings. No Featured Videos. No team-logo rail
S2  Favorites (if shown) = color + abbr rows, not marks
S3  Mobile shell: 56–64px header (burger / wordmark / account); nav is drawer or compact rail
S4  Desktop shell: wordmark + date + search + account; persistent ~240px rail. Medium is the same game/content as desktop without that rail
S5  Global notice slot (quiet dismissible banner) exists on the shell — not an ad
S6  Footer, if any, is quiet (copyright / report a problem), not a second nav
S7  Date control (prev / today / next / picker) is first on the scoreboard, not buried
S8  Game module anatomy: away (color, abbr + record when scores show) · score · home (color, abbr + record) · time · right-hand slot. **Venue / game location appears on the scoreboard row only pre-game** (scheduled). Once the game is live or final, location is not on the list — it lives on the Box room only. The slot is a modular block aligned right. Occupants (a setting): game status, room menu, win probability. Same hole, swapped contents — not a new row species per occupant
S8a Collapsed non-favorites: when that setting is on, games that do not involve a favorite team are a smaller bar by default. Favorites stay the full module. Draw both the full row and the bar
S9  Mobile scoreboard = one column of that module. Medium / desktop = 2–3 columns of the SAME module. The collapsed bar is still one column of bars on mobile
S10 Game header: ← back (returns to that day’s scoreboard) · both teams (color + abbr + record when scores show) · status · score. The back control is on the header bar, not buried
S11 Room bar: Videos · Live · Plays · Box · Recap as the possible set. **Live and Recap are never both present.** Pre-game: hide Live and Recap. After first pitch: show Live; keep Recap hidden. After the game ends: hide Live; show Recap when the recap is available. Other rooms may stay with empty-state copy when appropriate
S12 Videos: responsive **grid** whose column count grows with pairing/width, plus a control to switch to a **list**. Include sort and filter tool chrome (exact dimensions OPEN until product picks them). Browsing stays typographic (no poster cards). Row/cell = title, duration, impact mark, Primary play control. Recap/condensed = labels on the same species
S13 Live is the pitch theater. Anatomy: game status (diamond with runners, BSO pips, win-probability chart) · **pitcher + batter cards above the strike zone, each half the zone’s width** · strike zone · trajectory · accordion pitch list (newest pitches at top; most recent expanded by default). Mobile status is compact. **No linescore / box score on Live at any pairing.** FAIL leftover linescore on Live or a separate Pitch Theater page
S14 Linescore belongs on **Plays, Box, and Recap** at every pairing (mobile / medium / desktop) — not on Live. Box: team switcher (color + name), one table at a time on mobile; medium / desktop may sit away/home side by side. Venue / location may appear on Box after the game has started
S15 Recap: long-form document, not a headline stack — and includes the linescore
S16 Pitch sequence is an accordion list, not horizontal chips/tags. Zone ~220×280. No park behind the zone. Newest-first; most recent pitch expanded by default; collapsed and expanded row states both drawn
S17 Search: free-text + date/tag chips; typographic rows (title, date, teams as color+abbr) — not a photo gallery
S18 Standings: division tables, color + name/abbr, W-L, GB. No logos
S19 Settings groups are by **site area** (e.g. Game list · Game detail · Account), not by preference type. Game-list settings include **game-row slot** and **collapse non-favorites**. Account: magic link / passkey; Connect Patreon secondary. Mobile = one column; medium / desktop = two columns of the same groups. No “Save” as the hero. No Light / Dark / System control
S20 Coverage of the three pairings: at least one mobile frame, one medium (standalone, no rail) frame, and one desktop (medium + nav rail) frame of the same surface — labeled as those pairings
S21 Video player (dialog or stage): **always** shows this disclaimer under the player, verbatim:
      DISCLAIMER:
      This video is provided by MLBAM and MLB.com and has no affiliation with or connection to Baseball Theater. It has been displayed on your device via a public API provided by Major League Baseball.

COMPONENTS — states of objects on a screen, not extra screens. MISSING until drawn; FAIL if a drawn state is wrong
C1  Compact vs expanded is a *component* state (accordion row, game bar vs full module). It is not a host pairing. Do not name a pairing compact / expanded
C2  Scoreboard right-hand slot: at least two occupants drawn (status, room menu, win probability). Room menu = a **stack of links matching the game-detail tabs that exist for that game’s phase** (see S11 — Live vs Recap)
C3  Scoreboard collapsed bar (non-favorite) and full module — both
C4  Tooltips: closed and open. Help `?` is fine as a closed control (B8). Non-standard icons still need a label
C5  Modular blocks are one hole with swapped contents, not a new card species per content
C6  Pitch accordion collapsed and expanded — same as X8 / S16; newest-first with most recent expanded by default on Live
C7  Screens are built from F1–F6 instances. A new screen that redraws a game row from scratch FAILS B12 / F2

STATES (MISSING until drawn; FAIL if a drawn state is wrong)
X1  Loading: centered spinner; page title kept
X2  Error: short Primary-colored copy + recovery hint; no stack traces
X3  Empty: one muted sentence
X4  Live / in progress: Accent 2 **blinking** dot + status label; no colored background on the indicator
X5  Final: status change, no modal
X6  Scores hidden: structured fields blanked, card size stable — whole card not removed
X7  Game header with score hidden (separate from scoreboard hide)
X8  Pitch accordion on Live: newest-first; most recent expanded by default; at least one collapsed sibling also shown
X9  Scoreboard: full game module and collapsed non-favorite bar (both)
X10 Scoreboard right-hand slot: at least two occupants (room menu = tab link stack per S11 / C2)
X11 Room bar phase: draw at least one pre-game (no Live, no Recap), one in-progress (Live, no Recap), and one post-game with Recap available (no Live)
X12 Video player with the S21 MLBAM disclaimer visible under the player

OPEN DECISIONS — label alternatives; do not silently lock
O1  How strongly team color paints a module (quiet edge/swatch vs larger fill vs score-numeral-as-color). Contrast is the constraint
O2  Mobile game room chrome: scrollable top tabs vs bottom bar — one choice must eventually win for every mobile host
O3  Video player: dialog vs persistent stage — browsing stays typographic in both; S21 disclaimer is required in either
O4  Letterform favicon / simple Primary mark — not a team mark, not a photo
O5  Do NOT explore: photo-led chrome (news heroes, stadium stills, collage/promo photos, poster browsing), logos, headlines, ads, serif wordmarks, teal, night-park, news homepage, light mode, a standalone Pitch Theater, pitch chips as the Live sequence. Those are rejected, not variants. Small functional headshots are accepted — not an O5 reject
O6  No-spoilers for free-text titles (video/recap strings with the result baked in) is a product decision, not a visual one. Do not pretend blanking score numerals scrubs “Yankees win 5-3” in a title. Do not invent a treatment — mark N/A or note the leak
O7  Videos sort and filter dimensions — tool chrome exists (S12); exact fields still OPEN

COVERAGE (MISSING is OK; say which set is absent)
Set A  Shell + scoreboard: scheduled (venue OK), live/final (no venue on list), empty, loading, error, scores hidden; full row + collapsed non-favorite bar; at least two right-slot occupants; optional “Best of [date]” digest as ranked type, not a video grid
Set B  Game header (score shown + hidden, ← back, abbr+record), room chrome with Live/Recap phase rules, Videos (grid + list toggle + sort/filter chrome), player with S21 disclaimer
Set C  Live (status + pitcher/batter above zone + zone + trajectory + accordion; no linescore), Plays / Box / Recap each with linescore
Set D  Standings, Search, Settings (grouped by site area; game-list slot + collapse-non-favorites controls)
Set E  Component library: masters + variants for the objects in F2 / C1–C7; slot occupants, collapsed bar, accordion states, tooltip open/closed
Tokens page  Figma variables + text styles for the five hexes and type roles, and a “never” list — not a flat moodboard of unlinked swatches

Frame names should read like: scoreboard-live-mobile, scoreboard-collapsed-mobile, scoreboard-slot-winprob-desktop, game-header-hidden-score-desktop. Pairing suffix is mobile / medium / desktop. Component state (collapsed, expanded, tooltip, slot-*) goes in the name *before* the pairing — not as the pairing. Flag other breakpoint names.

OUTPUT FORMAT
## Verdict
STOP | REVISE | CONTINUE
one sentence: the single most important problem, or “no accepted-rule violations on frames that exist.”

## Fails
- [ID] frame-name — what’s wrong — smallest fix

## Open decisions
- [On] what the file shows now — whether alternatives are labeled

## Missing
- [ID or Set] what is not in the file yet

Do not generate new frames. Do not restyle. End after the three lists.

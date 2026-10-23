# Changelog

What shipped and why it matters — written for anyone, not just engineers. Each entry
leads with the **impact**: what was true before, what's different now. A **Details** line
underneath gives the technical trail (story ID, ADR, commit) for anyone who wants to go
deeper. Related stories that are clearly part of one larger effort are nested under a
bold section header; a change that stands on its own gets its own bullet.

This project is pre-launch — there's no public release yet, so entries are grouped by
theme rather than version number. **Most of what's below is backend work you can't see
yet** in the running app; it's the pipe that later screens will read from. Entries say so
explicitly where that's the case. For what's still ahead, see
[`docs/v3/BACKLOG.md`](docs/v3/BACKLOG.md).

---

## The app's API calls come straight from the API's published description

- **Before, the web app wrote out each server address by hand, separately from the description of
  what that address returns, so the two could drift apart without anyone noticing until a page
  broke. Now every call goes through a client generated from the API's published description: an
  address the API doesn't offer, a missing piece of the address, or the wrong kind of data is caught
  when the app is built, not by a user.** Nothing looks different in the app.
  Details: S49 — `web/src/api/client.ts` (`openapi-fetch`, `createClient<paths>` over
  `web/src/api/generated/bt-api.v1.ts`).
  _(2026-10-23)_

## The server speaks the standard web language, and its routes can't drift from the contract

- **Before, the API's request handling was written for one kind of server (Node's), and a new
  address could be added to it without anything checking it against the published list of what
  the API offers. Now the handlers use the standard request/response shape that every modern
  hosting platform understands — including Cloudflare, where the API is headed — and a test fails
  the moment the server answers an address the contract doesn't list, or the contract lists one
  the server doesn't answer.** Nothing changes for people using the app; this is groundwork that
  lets the API move to Cloudflare without a rewrite.
  Details: S44 — `functions/src/handlers/api.ts` (`handleApiRequest(request, ctx)`,
  `API_ROUTER`), `functions/src/adapters/node/http.ts`, `functions/src/handlers/route-table.test.ts`.
  _(2026-10-23)_

## Your account page is designed

- **Before, there was no approved picture of your account once you signed in, and the old
  design still offered a "magic link" sign-in that Baseball Theater no longer plans to use. Now
  the account section is approved: it shows who you're signed in as, a plain "Sign out" link,
  and whether your Patreon is linked — with your supporter tier, a way to manage it on Patreon,
  and a way to unlink it from Baseball Theater. Signing in itself will use Logto's own screens,
  so Baseball Theater doesn't build its own.** Nothing changes in the app yet; this unblocks
  building it.
  Details: S58 — `standings-search-settings/amendments/A3.md` and
  `shell-scoreboard/amendments/A5.md` (desktop header re-exported with the ratified version
  line), ratified 2026-10-22.
  _(2026-10-22)_

## What Hide Scores hides is designed

- **Before, turning on Hide Scores masked the scoreboard, but nobody had decided what a game page,
  a recap or a highlight list should show, so the setting couldn't be trusted to keep a game
  unspoiled. Now every screen has an approved answer: browsing shows no scores or winning
  pitchers, collapsed games show only their inning, and the recap video is retitled
  "Recap (score hidden)". Once you open a game's details you get the information you asked for:
  the box score is complete and the recap article is readable under a plain "Recap" heading, with
  only the running score kept back on Live and Plays.** Nothing changes in the app yet; this
  unblocks building it.
  Details: S57 — `amendments/A3.md` in game-rooms and shell-scoreboard, `amendments/A2.md` in
  game-shell, ratified 2026-10-21.
  _(2026-10-21)_
- **Nothing on screen announces that scores are hidden; the dashes and shaded blocks are the
  only sign, so the page stays as quiet as a normal one.**
  Details: owner direction, no story — `game-rooms/amendments/A4.md`, `game-shell/amendments/A3.md`,
  `shell-scoreboard/amendments/A4.md`, ratified 2026-10-21; S60 and S68 updated.
  _(2026-10-21)_

## The menus, signed-out view and loose ends are designed

- **Before, the menu and account buttons on the approved screens led nowhere anyone had agreed on,
  and a few drawn details contradicted later decisions. Now every button has an approved
  destination: the menu slides in on phones and tablets, signed-out visitors see "Sign in" and no
  Settings, a highlight found in Search plays right there with a link to its game, iPhones get
  step-by-step install instructions, and the stray details (a filter button, a subscription link,
  the version label) match what was decided.** Nothing changes in the app yet; this unblocks
  building it.
  Details: S56 — `amendments/A2.md` in shell-scoreboard, game-rooms and standings-search-settings,
  `amendments/A1.md` in game-shell, ratified 2026-10-21.
  _(2026-10-21)_

## The installed app and offline reading are designed

- **Before, nobody had drawn how Baseball Theater looks when it's installed on a phone, when the
  connection drops, or when a new version is ready. Now those screens are approved: the installed
  layout around the phone's notch and home bar, an "offline" marker that says how old the saved
  scores are, what a never-opened tab looks like offline, the wording of the update notice, and a
  quiet "Install app" link in Settings.** Nothing changes in the app yet; this unblocks building it.
  Details: S55 — `amendments/A1.md` in three design surfaces, ratified 2026-10-21 (ADR-023).
  _(2026-10-21)_

## The app can't quietly get heavier or less tested

- **Before, the app's download could grow and the tests could cover less without anyone
  noticing. Now every check run fails if the code that loads before the page is usable passes
  200 KB (it is about 144 KB today), and each part of the code must stay at least as well tested
  as it is now — the bar only goes up.** Tests can also count how often a screen redraws, so a
  slow screen can be caught and pinned. Nothing changes in the app itself. Details: S54 —
  `pnpm size` (`size-limit`, `.size-limit.json`) in `pnpm verify`, coverage floors at measured
  values, `web/src/test/renderCount.tsx`, backlog rule 21 (ADR-026). _(2026-10-20)_

## Copied code and out-of-date comments get caught automatically

- **Before, nothing noticed when a block of code was copy-pasted somewhere new, or when code changed
  and the comment explaining it didn't. Now every check run fails on copy-pasted code, a one-line
  command lists comments that may have gone stale after a change, and every story has to record
  what existing code it reused before writing new code.** Nothing changes in the app itself; this
  keeps the code easier to trust as it grows. Details: S53 — `pnpm dup:check` (`jscpd`,
  `.jscpd.json`) in `pnpm verify`, `pnpm comments:stale` (`tools/comments-stale/`), backlog rule 20
  (ADR-025). _(2026-10-19)_

## "Is this game live?" now has one answer everywhere

- **Before, the app decided whether a game was live in three different ways, so the scoreboard,
  the game page and the data feed could disagree, and nothing stopped the next screen from adding
  a fourth. Now each of those answers — the game's phase, which tabs it shows, what a pitch did —
  is worked out in one tested place, and an automatic check rejects any screen that does its own
  math on game data.** Pitch dots now use the app's own ball / strike / in-play colors, and the
  Live tab shows only while a game is actually being played — not during warm-up or a delay. Details: S52 — `packages/domain/src/game-phase.ts`, `pitch-outcome.ts`,
  `battedBallChartRangeFt` in `coordinates.ts`; ESLint rule `tools/eslint-rules/no-domain-arithmetic.js`
  (ADR-025); `experimentalDecorators` removed from `tsconfig.base.json` (ADR-024). _(2026-10-19)_

## The old Google database code is gone

- **Before, the code still carried a Firebase/Firestore database the project had already decided
  to leave, so anyone reading it could build on a dead path. Now the repo has no Google Cloud
  dependency at all — only the storage the app actually runs on remains, and Postgres takes over
  the durable side.** Nothing visible changes in the app. Details: S42 — deleted
  `functions/src/adapters/firestore/`, `@google-cloud/firestore`, the `BT_USE_FIRESTORE` switch in
  `functions/src/local-server.ts`, `firebase.json` and `.firebaserc` (ADR-017). _(2026-10-19)_

## Repeated updates can't roll a game backward, and quiet games stop being re-checked

- **Before, nothing guaranteed that a duplicated or late update couldn't put an older state of a
  game back on screen, and every finished game was re-checked every five minutes forever. Now one
  tested rule keeps only the newest version of a game whatever order updates arrive in, a
  fingerprint tells a real change from a repeat, and one schedule decides how long an unchanged game
  may be cached — five minutes right after a change, growing to two days for a game that has gone
  quiet.** This is groundwork: nothing uses it yet; the live path and the edge cache build on it.
  Details: S43 — `packages/domain/src/versioning.ts` (`applyIfNewer`, ADR-022),
  `content-hash.ts` (`contentHash`), `cache-lifetime.ts` (`cacheLifetimeMs`, ADR-021), each with
  its colocated test. _(2026-10-19)_

## Game pages open with the approved header and only the tabs that fit

- **Before, every game page showed the score at the top, even where the design says it must
  never appear, and offered all five tabs whether or not they made sense: a Live tab on a
  finished game, a Recap tab before first pitch. Now a game opens with a simple top bar (back to
  that day's scoreboard, the two teams, the date, and a green `LIVE` dot while it's on), only the
  tabs that fit the game's moment, and the same loading, empty and "couldn't load, retry" look
  in every tab.** Details: S40 — `web/src/components/game/` (`GameTopBar`, `gamePhase`,
  `RoomState`, `LiveRoom`), `web/src/pages/GamePage.tsx`, tested in `GamePage.test.tsx` and
  `gamePhase.test.ts`. _(2026-10-15)_

## The app now wears its approved colors

- **Before, the app still used the old reddish-dark background and could flip to a light mode
  the design no longer has. Now every screen sits on the approved near-black, the app is always
  dark (the browser's toolbar matches), and the approved card, highlight, readable-red and
  pitch colors (ball green, strike red, in play blue) are ready for each screen built next.**
  Details: S39 — `web/src/styles.css` tokens, Mantine `colors.dark` + `forceColorScheme="dark"`
  in `web/src/App.tsx`, `theme-color` in `web/index.html`, tested in `web/src/App.test.tsx`.
  _(2026-10-15)_

## Every screen now has an approved design to build from

- **Before, the drawings for the app existed but nobody had signed off on them, so no screen
  could be built. Now the owner has approved all four sets — the scoreboard and app frame, the
  game screen and Videos, the Live / Plays / Box / Recap rooms, and Standings / Search /
  Settings — and the stories that build those screens can start.** Along the way the owner made
  the calls the drawings were waiting on: scores never sit in the game's header; Plays became a
  browsable, inning-by-inning list of every at-bat with each pitch and the strike zone, plus a
  scoring-plays view; pitches are colored ball green, strike red, in play blue; the page is a
  near-black `#10100F` with warm-grey cards; red text is brighter so it reads on dark; the
  day's highlights get a dull-gold card with the clip's thumbnail; Settings gains Favorite
  Teams and a Video Player choice. No visible change in the app yet; this is design work.
  Details: S31, S32, S33, S34 — `docs/v3/visual/*/DESIGN.md` and `RATIFIED.md`; VISUAL-DESIGN
  §3, §5, §5a, §6, §9 updated. _(2026-10-14)_

## The Standings, Search and Settings drawings now cover every screen size

- **Before, Standings, Search and Settings were drawn only for phones, and Settings was
  organized by kind of preference ("How It Looks", "What Is Hidden"), not by the part of the
  site each option changes. Now all three screens are drawn for phones, tablets and desktops,
  and Settings is grouped as Game list, Game detail and Account, with the scoreboard's
  right-hand-block choice and the collapse-other-teams switch both under Game list.** No
  visible change in the app yet; this is design work. Details: S38 — R13, R17b, R18 applied in
  Figma; 9 exports plus `REVISIONS.md` in `docs/v3/visual/standings-search-settings/`, which
  S34 catalogs. By owner decision Hide Scores sits under Game list. _(2026-10-13)_

## The Live, Box and Recap drawings now match what the owner decided

- **Before, the Live drawing hid the pitch that just happened at the bottom of a collapsed
  list and put the pitcher and batter below the action, and every game room showed where the
  game was played. Now the newest pitch is at the top and already open, the pitcher and batter
  sit above the strike zone, and the ballpark appears only on the box score.** No visible
  change in the app yet; this is design work. Details: S37 — R6, R7, R8, R11, R12, R18 applied
  in Figma; 12 exports plus `REVISIONS.md` in `docs/v3/visual/game-rooms/`, which S33 catalogs.
  By owner decision the Live top bar keeps plain team abbreviations (no records). _(2026-10-12)_

## The game screen's design drawings now match what the owner decided

- **Before, the drawings of a game's screen always showed all five tabs, put a red "LIVE"
  sticker on finished games, used a fixed two-column video layout, and had no video player
  (so no place for the required MLB notice). Now they show only the tabs that make sense for
  a game before, during and after play, the video grid widens with the screen and switches to a
  list, and a player carries MLB's disclaimer in every version.** No visible change in the app
  yet; this is design work. Details: S36 — R6, R7, R10, R14b, R15, R18 applied in Figma; 12
  exports plus `REVISIONS.md` in `docs/v3/visual/game-shell/`, which S32 catalogs. The player's
  dialog-vs-stage choice and the first filter fields stay open for S32. _(2026-10-10)_

## The scoreboard's design drawings now match what the owner decided

- **Before, the drawings of the app shell and scoreboard disagreed with decisions the owner
  had already made: city-style records under the scores, error hints in the wrong color, no
  place for an app notice, no room-menu option for a game row, and the empty / loading /
  error / hidden-scores / collapsed screens drawn for phones only. Now the drawings match those
  decisions at every screen size, so the design that gets approved (and later built) is the
  one the owner actually chose.** No visible change in the app yet; this is design work.
  Details: S35 — revisions R6–R18 applied in the Figma file; 22 exports plus `REVISIONS.md`
  in `docs/v3/visual/shell-scoreboard/`, which S31 catalogs for ratification. _(2026-10-10)_

## Pages now share one copy of the data, so updates land everywhere at once

- **Before, each page fetched its own copy of a game or a day's scores, so two parts of the
  screen could disagree and every visit re-fetched from scratch. Now the app keeps one shared
  copy: when it updates, everything showing that game updates together, and nothing you have
  open — a play you expanded, a tab you switched to — gets thrown away and rebuilt.** How often
  the app re-checks is decided by the server, so pages don't poll for news that can't exist yet.
  Details: S25 — TanStack Query v5 with one descriptor, hook and named cache writer per resource
  (`web/src/api/game.ts`, `schedule.ts`); payload types derive from the S26 route contract; a
  type-level test proves a wrong-typed cache write fails the build. Groundwork for live updates
  (S19/S20) — see [ADR-014](docs/v3/ARCHITECTURE.md#adr-014--client-state-management-accepted).
  _(2026-09-15)_

## Under the hood: the app's API now has a public description, and a check that stops it breaking existing clients

- **Before, the only description of how to talk to the app's server was its own source code, and
  nothing stopped a change from quietly breaking an app or tool that relied on it. Now there's a
  standard, machine-readable description of the API that anyone can read, generated automatically
  from the code, and every change is checked against the last published version — anything that
  would break an existing client is blocked before it ships.** No visible change in the app.
  Details: S27 — `openapi/bt-api.v1.json` is generated from the S26 route table (`pnpm api:spec`,
  never hand-edited); `pnpm api:breaking` runs oasdiff against the committed baseline
  `openapi/bt-api.v1.baseline.json`, and CI runs both. See [ADR-015](docs/v3/ARCHITECTURE.md#adr-015--api-versioning--compatibility-accepted).
  _(2026-09-15)_
- **Before, that API description was generated from the code but nothing checked it was actually
  right — a missing field or a wrong "can be empty" marker could sit in it, trusted and wrong.
  Now the app's own build reads the description back and fails if it no longer matches the data
  the server really sends, so it can't quietly drift from reality.** No visible change in the app.
  Details: S29 — `openapi-typescript` renders the spec into committed `web/src/api/generated/`
  (`pnpm api:types`, offline; a Vitest drift test fails when it's stale); a type-level test proves
  each route's generated type and its `*Response` alias are mutually assignable, and
  `api/game.ts` / `api/schedule.ts` now take their payload types from the generated module. See
  [ADR-016](docs/v3/ARCHITECTURE.md#adr-016--generated-client-dal-from-the-openapi-spec-accepted).
  _(2026-09-18)_

## Behind the scenes: the project plan is now browsable and editable in Obsidian

- **The plan of what gets built next used to be one 1,700-line document that was hard to find
  your way around. Now every planned piece of work is its own note, with sortable tables of
  what's done, what's next, and what depends on what, and it can be edited right there.** The
  single combined document still exists and is rebuilt automatically, so nothing that relied on
  it breaks, and the automated checks refuse any change where the two drift apart.
  Details: vault migration V1–V3 ([docs/v3/VAULT-MIGRATION.md](docs/v3/VAULT-MIGRATION.md)):
  story notes in `docs/v3/backlog/`, `pnpm backlog:build` regenerates `docs/v3/BACKLOG.md`,
  and `pnpm backlog:check` runs in `pnpm verify` and CI. No product change.
  _(2026-09-13)_

## Under the hood: a mismatch between the app's server and its screens now gets caught before it ships

- **If a future update ever made the server send different data than a screen expects, that
  mistake is now caught automatically before the change goes out — not discovered later as a
  broken page.** Every API route now also carries a version number, so a future change to
  how the server responds can't silently break something that was already relying on the
  old shape.
  Details: S26 — one shared, checked declaration ties each route to its response type on both
  the sending and receiving end; routes moved to `/api/v1/…`. Also lays a cheap seam
  (`<Type>Response` aliases) for decoupling the API from internal changes later, without
  building a full separate contract layer now — see [ADR-014](docs/v3/ARCHITECTURE.md#response-aliases--the-dto-seam-accepted-2026-09-13).
  _(2026-09-13)_

## The app looks like Baseball Theater now — not a placeholder

- **The app switched from a stand-in color scheme and font to its real brand look**: a
  red/gold/green palette, one consistent typeface (IBM Plex Sans) for headings and body
  alike, and automatic light/dark mode that follows your device instead of being locked to
  one setting. This is visible today if you open the app — every screen built from here
  forward starts on-brand instead of needing a redo later.
  Details: S24 — five brand tokens wired into the Mantine theme (`defaultColorScheme="auto"`,
  primary color anchored on `#CE0F0F`), old placeholder tokens and gradient removed. _(2026-09-13)_

## Cloud-storage readiness

- **The app's data can now live in Firestore (Firebase's database) instead of only in the
  server's memory, with no other code needing to change.** That's a required step toward
  running in the real world instead of just on a laptop. Local development still needs no
  cloud account or credit card — this is opt-in.
  Details: S7 — a Firestore adapter behind the existing repository interfaces, emulator-ready. _(2026-09-10)_

## Under the hood: making the test suite's pass/fail signal actually true

- **The automated checks that are supposed to catch bugs before they ship were quietly not
  running as strictly as everyone believed.** A tooling gap meant part of the test-coverage
  requirement was silently skipped by the very script meant to enforce it — for weeks,
  "all green" didn't fully mean what it claimed. That's now fixed, and the gaps it exposed
  are being closed rather than argued away.
  Details: root `pnpm test:coverage` rewired to actually gate on each package's coverage
  threshold instead of just reporting a number; the `functions` package's real gap
  (mostly two data-mapping files that only had their "happy path" tested) closed with new
  test cases, no behavior changed. _(2026-09-10)_

- **The codebase now follows one consistent formatting style everywhere**, matching the
  team's preference (tabs, a specific brace style, and a few other conventions) — enforced
  automatically on every commit so it can't drift. Mechanical change; nothing about how the
  app behaves is different. _(2026-09-10)_

## Real MLB game data, end to end

Before this work, the app only knew how to replay a handful of hand-picked practice games
saved to disk. This effort teaches it to talk to MLB's actual live game service — the
foundation every future screen (live scores, box scores, standings) will read from.

- **The backend can now fetch a real MLB game — in progress or finished — and understand
  every part of it**: score, inning-by-inning detail, every pitch (speed, location, spin),
  highlight videos, and full team/player info. Previously it only understood a few
  practice games that had been manually shaped to fit.
  Details: S11 (typed contracts for MLB's data), S12 (the live connection + translators),
  S13 (standings, article content, player bios), S23 (near-total field coverage with an
  automatic "did we miss something" check). _(2026-09-08)_

- **Live games now update automatically while they're being played, and the app stops
  checking once they're over** — so MLB's servers only get contacted for games that are
  actually happening right now, not once per person looking at the page.
  Details: S21 (raw MLB data gets turned into the app's own stable, queryable records),
  S16 (an active-window polling loop, per ADR-002). _(2026-09-09)_

- **Looking up an old, finished game no longer serves data that's stuck from whenever it
  was first loaded — but it also won't hammer MLB's servers just because a page got
  opened twice.** A background safety valve refreshes it once, then waits before trying
  again.
  Details: S17 — refresh-on-read with request de-duplication and a cooldown. _(2026-09-09)_

- **A finished game's entire play-by-play can now be replayed at any point or any speed,
  without ever asking MLB for it again.** The full sequence of what happened is captured
  once, right after the final out, and stored for good.
  Details: S22 — captures MLB's official timecode-by-timecode diff log for a finished
  game and reconstructs any moment from it. Verified against a real recorded game (534
  captured changes, exact final score reproduced from scratch). _(2026-09-09)_

- **When MLB adds something new to their data feed, the team now finds out automatically
  instead of it going unnoticed.** A drift scanner compares what's actually in MLB's
  responses against what the app understands, and flags anything new.
  Details: S15 (`pnpm mlb:scan-drift`), S14 (a recorder that keeps the app's practice-game
  test data up to date from the real MLB feed on demand). _(2026-09-09)_

## Getting the basics solid

- **The app correctly knows which games are "in progress" versus "not yet" or "long
  over"** — the judgment call every live-update feature above depends on getting right.
  Details: S1 — domain window-detection logic, fully tested. _(2026-09-08)_

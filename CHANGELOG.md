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

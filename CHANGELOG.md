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

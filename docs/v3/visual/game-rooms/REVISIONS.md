# Live, Box + Recap rooms — Figma revisions (S37)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-12 — live file as edited and exported in the S37 session (the Plugin API cannot save a named version; no named version was taken).

Exports are 1× PNG renders of the frames with the same names. Frame node IDs: `live-mobile` `5:1470`, `live-medium` `230:2050`, `live-desktop` `230:2616` (both instances of the `live-game` component `230:2049`), `box-mobile` `190:2876`, `box-medium` `235:2521`, `box-desktop` `235:2906`, `plays-mobile` `235:2430`, `plays-medium` `235:2815`, `plays-desktop` `235:3086`, `recap-mobile` `190:3032`, `recap-medium` `235:2722`, `recap-desktop` `235:3050`.

## Revisions

| ID  | What changed | Exports |
| --- | ------------ | ------- |
| R6  | The Live frames show the live game with S36's `game-topbar` indicator: a blinking Accent 2 dot plus a `LIVE` label, with no background, pill or chip. Nothing was redrawn here; the frames inherit it. Box, Plays and Recap show a final game, so they carry no live indicator. | `live-mobile.png`, `live-medium.png`, `live-desktop.png` |
| R7  | Box, Plays and Recap read each team as abbreviation plus record (`NYY (94-58)`, `BOS (87-65)`) through S36's `game-header-mobile`. **Live frames keep plain abbreviations (`NYY @ BOS`) by owner decision**: with records, the 390px Live top bar overflowed and cut off the date, and the owner said, "get rid of the records in the header for those." The medium and desktop Live top bars match mobile. | `box-mobile.png`, `plays-medium.png`, `recap-desktop.png`, `live-mobile.png` |
| R8  | The venue is shown on Box only. Box keeps `Fenway Park · Sep 21, 2026` in the header meta line. Plays and Recap now read `Sep 21, 2026` there (instance overrides on `game-header-mobile`). | `box-mobile.png`, `box-medium.png`, `box-desktop.png`, `plays-mobile.png`, `recap-mobile.png` |
| R11 | The pitch accordion is newest-first on every Live frame, and the most recent pitch is the open row at the top. On mobile, `5 · 4-Seam Fastball` (in play) now leads and `1 · 4-Seam Fastball` is last. On medium and desktop (the `live-game` component's `pitch-accordion`), `Cutter` (in play) leads, expanded, ahead of Sinker, Changeup, Slider, Four-Seam. No separate collapsed frame was added. | `live-mobile.png`, `live-medium.png`, `live-desktop.png` |
| R12 | The pitcher and batter cards sit above the strike zone, each half the zone's width. On mobile, the cards are new (the frame had only the "Cole vs Devers" text line). They are two 175px cards with an 8px gap over the 358px zone and trajectory view. On medium and desktop, the cards moved out of the row under the visuals and into the `split-visuals` component: a new `zone-column` stacks two 184px cards (16px gap) over the 384px zone card. The status and win-probability column stays to the right. | `live-mobile.png`, `live-medium.png`, `live-desktop.png` |
| R18 | Renamed `live-mobile-dark` → `live-mobile`. Every Live, Box, Plays and Recap frame now ends in a pairing. | `live-mobile.png` |

## Choices made while applying (for the owner to check before S33 ratifies)

- At half width, the card meta lines wrap to two lines (`RHP · 94 Pitches` / `(61 S)`, `LHB · 2-3, HR, 3` / `RBI`) instead of being shortened.
- On mobile the `Cole vs Devers` / count / result line stays above the new cards. It is not part of any revision, so it wasn't removed, even though the names now appear twice.
- R8 keeps the venue in the place Box already showed it (the header meta line) instead of adding a new block to the Box body.

## Seen but not changed (outside S37's revisions)

- The Live frames' tab bar still shows both Live and Recap. VISUAL-DESIGN says they never appear together (S36 R14b fixed this on its phase frames).
- On `box-mobile`, `plays-mobile` and `recap-mobile` the linescore is cut off at the left edge (`AM`, `'Y`, `)S`).
- The Videos frames (S36, `docs/v3/visual/game-shell/`) still show the venue in the header meta line during and after the game.
- The `strikezone` reference frame in section C doesn't end in a pairing; it is a drawing source, not a room frame.

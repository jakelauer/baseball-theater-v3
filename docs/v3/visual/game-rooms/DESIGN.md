# Live, Box + Recap rooms — design (S33)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-14 — live Figma file as edited and exported in the S31–S34 design session (the Plugin API cannot save a named version; no named version was taken).

Frame revisions before this session are logged in [`REVISIONS.md`](./REVISIONS.md) (S37, 2026-10-12). This session applied the carry-in fixes and the owner's decisions below, added three room-state frames, and re-exported every frame here.

## Frames

Every export is a 1× PNG of the Figma frame with the same name. Every room opens with the `game-topbar` (← back · `NYY @ BOS` · live indicator while in progress · date) and the phase's tabs; no header carries a score.

| Export | Pairing | What it shows |
| ------ | ------- | ------------- |
| `live-mobile.png` | mobile | Live, in progress. Tabs Videos · Live · Plays · Box (no Recap). Compact status row: base **diamond**, the score `NYY 4 · BOS 2`, **BSO** pips, `Bot 7th · 1 Out`. Matchup line, then pitcher and batter cards (each half the zone's width) above the strike **zone** and pitch **trajectory** view, then the pitch-sequence **accordion**: newest pitch at the top and **expanded** (spin, break, release, zone, result), older pitches **collapsed**. No linescore and **no box score**. No win-probability chart at this pairing. |
| `live-medium.png` | medium | Same Live room, standalone: tabs; pitcher/batter cards over the **zone** and **trajectory** card on the left; status card (**diamond**, score `NYY 4 · BOS 2`, **BSO**, inning) and the **win probability** chart on the right; the pitch **accordion** below with the newest pitch **expanded** and the rest **collapsed**. No linescore. |
| `live-desktop.png` | desktop | The medium Live room beside the nav rail: **diamond**, **BSO**, score, **win probability** chart, **zone**, **trajectory**, **accordion** (newest **expanded**, rest **collapsed**). |
| `box-mobile.png` | mobile | Box, final. Tabs Videos · Plays · Box · Recap (no Live). Full linescore with each inning in its own box, R · H · E (`5 9 0` / `3 7 1`); team switcher (NYY selected); one batting table; **Game info** (Venue Fenway Park, First pitch, Weather, Wind, T, Att). |
| `box-medium.png` | medium | Same Box room, standalone. |
| `box-desktop.png` | desktop | Same Box room beside the nav rail. |
| `plays-mobile.png` | mobile | Plays, final: boxed-inning linescore; the **floating inning sidebar** (innings 1–9 in order, then **Runs** for scoring plays) pinned at the right with **9** selected — the most recent inning with plays; the 9th open with **Top 9th · NYY** and **Bottom 9th · BOS**, each a list of at-bat accordion rows (batter — result, pitcher · pitches · outs). The last at-bat is **expanded**: pitcher and batter cards, the strike **zone** and trajectory, and its pitch list (newest pitch expanded). |
| `plays-medium.png` | medium | Same Plays room, standalone, wider. |
| `plays-desktop.png` | desktop | Same Plays room beside the nav rail. |
| `plays-scoring-mobile.png` | mobile | Plays with **Runs** selected: every scoring play of the game in order, not tied to an inning — inning tag, batter — result, pitcher and the score after the play (`BOS 2–0` … `NYY 5–3`). |
| `recap-mobile.png` | mobile | Recap, final: top bar and tabs, then the long-form recap (headline, paragraphs, source). No linescore, no score module. |
| `recap-medium.png` | medium | Same Recap document, wider measure. |
| `recap-desktop.png` | desktop | Same Recap document beside the nav rail. |
| `room-loading-mobile.png` | mobile | The one room-state example, loading: top bar and tabs stay; centered loader. |
| `room-empty-mobile.png` | mobile | Room-state example, empty: one muted sentence ("No box score yet."). |
| `room-error-mobile.png` | mobile | Room-state example, error: Primary "Couldn't load this room", recovery hint, Retry. |

## Decisions

Recorded as the owner stated them.

- **Score placement** (owner, 2026-10-14): "It shouldn't go in the header ever. Plays and Box Score should have a full line score with boxes for the innings. Recap should have nothing. Videos should have nothing. Live should have the score, but not in the header."
- **Live score position** (owner, 2026-10-14): "In a small status near the diamond status."
- **Header module** (owner, 2026-10-14, asked whether Live dropping the team-lines/score module was deliberate): "None of them should have that in the header. That isn't supposed to be there." Removed from every room.
- **Top bar on Box / Plays / Recap** (owner, 2026-10-14): "Missing, add it." Added to all nine frames.
- **Status in the top bar** (owner, 2026-10-14): "No status." Only the live indicator shows, while in progress.
- **Live top bar records** (owner, S37, 2026-10-12): "get rid of the records in the header for those." The top bar reads plain abbreviations.
- **Accordion states** (owner, 2026-10-14): the newest-expanded, rest-collapsed Live frames are "enough"; no all-collapsed frame.
- **Room empty / loading / error** (owner, 2026-10-14): "We need one example that we will use for all of them." Drawn once, on the Box room, as the `room-*-mobile` frames.
- **Plays** (owner, 2026-10-14): "Plays is basically like browsing a list of the individual batters in Live - it shows each pitch, the strike zone, etc. All of that should exist in Plays, and you need to be able to select the inning you're looking at. By default, it should show the most recent inning that has any actual information to show. It needs a floating sidebar showing all of the innings in order. Opening an inning shows the top and bottom of the inning with expandable at-bat accordion items. It also needs an option to show all scoring plays, which is not inning-specific; it shows all the scoring plays for the entire game."
- **Pitch colors** (owner, 2026-10-14): "Balls are usually green, strikes red, in play blue." Dots, trajectories, row markers and result labels color by outcome (`color/pitch/ball`, `color/pitch/strike`, `color/pitch/in-play`).
- **Venue on Box** (owner, 2026-10-14): "The box score page will have all kinds of details and stats and that's just one of them." Venue is one line of Box's Game info block.

These amend the written spec's room table (Recap no longer has a linescore). VISUAL-DESIGN §5 is updated to match; §9 "Linescore placement" is updated in place, with no link to this file.

## Interpretation

The agent's reading of things the frames show that no decision states. Each is the agent's, for the owner to confirm by ratifying.

- *Agent:* "boxes for the innings" is drawn as a 1px hairline box (3px radius) around each of innings 1–9 on both team rows; the header row and R · H · E stay unboxed. Unplayed innings would show an empty box.
- *Agent:* the mobile linescore fits 390px by sitting in the standard 16px gutter with 12px inner padding and 2px between cells — no scrolling, dropped columns or abbreviations.
- *Agent:* the Live score reads `NYY 4 · BOS 2` in the status row's type style, right of the diamond on mobile and at the top of the status card on medium/desktop.
- *Agent:* Box's Game info uses MLB's own boxscore labels (Venue, First pitch, Weather, Wind, T, Att — as in `fixtures/raw/live-823823-base.json`) in the batting table's header style, label column 88px. Umpires and the other MLB info lines are left off the drawing for length; the build may show every line MLB sends.
- *Agent:* sample data now agrees: the final is 5–3 in the linescore (NYY `0 0 2 0 3 0 0 0 0`, BOS `0 2 1 0 0 0 0 0 0`) and in the R/H/E, matching the scoreboard frames. The innings follow the recap's story.
- *Agent:* the inning sidebar floats at the right edge at every pairing (one rule, and in reach of the thumb on mobile). Innings are 36×30 targets; the selected inning fills Primary with Light text; **Runs** sits under a hairline below inning 9. Extra innings extend the list.
- *Agent:* an expanded at-bat shows the same modules as Live, in Live's order: pitcher and batter cards (no headshots, to fit beside the sidebar), the zone/trajectory view, then the pitch accordion newest-first with the last pitch open. In the default view the game's last at-bat is the open row.
- *Agent:* at medium and desktop the at-bat contents keep their mobile width (zone 326px) inside the wider column; they do not stretch.
- *Agent:* the pitch rows inside the expanded at-bat reuse the sample `pitch-accordion-row` data (two rows read `1 · 4-Seam Fastball`); the zone view reuses Live's sample pitches. Sample data, not layout.
- *Agent:* the chevrons on at-bat rows are text glyphs (`▾` / `▴`); the build uses the icon set's chevron, as Live's rows do.
- *Agent:* scoring rows use the at-bat row's collapsed style and expand the same way; the meta line ends with the score after the play.
- *Agent:* the room-state example uses the Box room; its copy ("No box score yet.", "Couldn't load this room") is the agent's; each room swaps in its own sentence.
- *Agent:* the Recap headline from MLB still contains the score (`NYY 5, BOS 3 — …`). That is editorial copy, not a score field; the no-spoilers rule for free-text titles is out of scope (§9, FEATURES).

## Open questions

None.

## Work required

- **S2 / S3 / Plays**: pitch dots, trajectories, row markers and result labels color by outcome — ball green, strike red (Primary Light), in play blue — from the `pitch/*` theme roles.
- **S3** (Live tab): top bar + tabs; compact status with base diamond, BSO pips, inning, and the score beside the diamond (never in the header); pitcher/batter cards above the zone; trajectory; pitch accordion newest-first with the latest expanded. Medium/desktop add the win-probability chart beside the zone and trajectory. No linescore, no box score on mobile.
- **S2** (Box tab): top bar + tabs; full linescore with each inning boxed and R · H · E; team switcher; one batting table at a time; a Game info block with Venue and the other MLB boxscore info lines.
- **Plays** (built with S2/S3 in the shared game route): top bar + tabs; the boxed-inning linescore; the floating inning sidebar (innings in order + Runs), defaulting to the most recent inning with plays; the selected inning's top and bottom halves as at-bat accordion rows that expand to the pitcher/batter cards, zone/trajectory and pitch accordion; Runs shows every scoring play of the game, each expandable the same way.
- **S10** (Recap tab): top bar + tabs; the recap document only — no linescore, no score.
- **S2 / S3 / S10 / S19**: loading, empty and error in any room follow the one `room-*-mobile` example — top bar and tabs stay, the room body shows the loader, one muted sentence, or Primary error copy with Retry.
- **S19** (watched-game updates): live updates change the Live status row's score, count and inning in place; the header never shows a score.

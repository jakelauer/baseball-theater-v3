# Game header, room chrome + Videos room — design (S32)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-14 — live Figma file as edited and exported in the S31–S34 design session (the Plugin API cannot save a named version; no named version was taken).

Frame revisions before this session are logged in [`REVISIONS.md`](./REVISIONS.md) (S36, 2026-10-10). This session removed the team/score header module (`game-header-mobile`) from every frame here and named the facet chips, then re-exported all twelve frames.

## Frames

Every export is a 1× PNG of the Figma frame with the same name. Every game frame opens with the `game-topbar`: **← back** · `NYY @ BOS` · live indicator (only while in progress) · date. No frame has a score in its header.

| Export | Pairing | What it shows |
| ------ | ------- | ------------- |
| `game-phase-pregame-mobile.png` | mobile | Pre-game: top bar with ← back; tabs Videos · Plays · Box (no Live, no Recap); Videos room. |
| `game-phase-live-mobile.png` | mobile | In progress: top bar with ← back and the Accent 2 dot + `LIVE` label; tabs Videos · Live · Plays · Box (no Recap); Videos room. |
| `game-phase-final-mobile.png` | mobile | Final: top bar with ← back; tabs Videos · Plays · Box · Recap (no Live); Videos room. |
| `game-videos-grid-mobile.png` | mobile | Videos room, grid mode: "Impact-sorted videos" label, search, Filter, facet chips **Featured team** and **Stat / viz**, Grid/List toggle (Grid selected), two-column thumbnail grid (still, duration, title, meta). |
| `game-videos-grid-medium.png` | medium | Same room, three-column grid, no rail. |
| `game-videos-grid-desktop.png` | desktop | Same room beside the nav rail, four-column grid. |
| `game-videos-list-mobile.png` | mobile | Videos room, list mode: the same clips as rows (small thumbnail, title, meta), List selected. |
| `game-hidden-score-mobile.png` | mobile | Hide scores on: an older top bar (← back · `NYY @ BOS`, no date) and the Videos room labeled "Videos (spoiler-free mode)"; footer reads "Scores hidden in settings". |
| `video-player-dialog-mobile.png` | mobile | Player as a **dialog** (**default**): still, Primary play control, progress and time, title, the MLBAM disclaimer, close `✕`. The page behind the scrim is drawn fully dimmed. |
| `video-player-dialog-medium.png` | medium | Same dialog at medium. |
| `video-player-stage-mobile.png` | mobile | Player as a **persistent stage** (user setting): the player sits at the top of the Videos room above the grid, disclaimer under it. |
| `video-player-stage-medium.png` | medium | Same stage at medium. |

## Decisions

Recorded as the owner stated them.

- **Game header** (owner, 2026-10-14): the score "shouldn't go in the header ever. Plays and Box Score should have a full line score with boxes for the innings. Recap should have nothing. Videos should have nothing. Live should have the score, but not in the header." Earlier answer the same day, about the team-lines/score module: "None of them should have that in the header. That isn't supposed to be there." The game view's header is the top bar alone.
- **Status in the top bar** (owner, 2026-10-14): "No status" — pre-game time and Final are not shown in the top bar; the tabs present (Live vs Recap) imply the phase. The live indicator (dot + `LIVE`) stays while in progress (S36 R6).
- **Mobile game room chrome** (VISUAL-DESIGN §9): **scrollable top tabs, as drawn** — owner's choice, 2026-10-13: "Top tabs (as drawn)." One choice for every mobile game; no bottom bar.
- **Video: dialog vs persistent stage** (VISUAL-DESIGN §9): "Configurable by the user, defaulting to the dialog overlay" (owner, 2026-10-13). Both alternatives are accepted; neither is rejected. The control lives in Settings → Game detail (owner, 2026-10-14: "Game detail group"; drawn in `docs/v3/visual/standings-search-settings/`).
- **Videos sort / filter fields** (VISUAL-DESIGN §9): the first shippable set is **Featured team** and **Stat / viz clips** (owner, 2026-10-13). Other facets enrich over time.
- **Thumbnail overlays** (owner, 2026-10-14): "Light on Dark 50%" — duration badges and play icons on video stills use Light on Dark at 50%, not white on black.
- **Venue** (carry-in): applied by the owner's header decision — with the header module gone, no Videos or player frame shows `Fenway Park`. The owner approved the fix on 2026-10-14 ("Venue off Videos frames").

## Interpretation

The agent's reading of things the frames show that no decision states. Each is the agent's, for the owner to confirm by ratifying.

- *Agent:* facet chips read `Featured team` and `Stat / viz`, in that order, left of the Grid/List toggle. The chips filter; "Impact-sorted videos" remains the default sort label.
- *Agent:* with the header module removed, the team **records** no longer appear anywhere in the game view (they lived in that module). The top bar keeps plain abbreviations, matching the owner's S37 call for Live ("get rid of the records in the header for those").
- *Agent:* `game-hidden-score-mobile` uses an older top bar than `game-topbar` (no date, a stray circle icon at the right). The build uses `game-topbar` everywhere. The frame no longer has a score to hide; it remains as the hide-scores example for the Videos room (spoiler-free label, footer note). It predates S36 R10, so it has no facet chips or Grid/List toggle.
- *Agent:* `game-videos-grid-desktop` is 1280px wide (a 1040px canvas beside the rail), wider than the 1008px desktop frames elsewhere; S36 R10 drew four columns there. The build should treat desktop as the medium canvas plus the rail (VISUAL-DESIGN §5), with the grid growing a column where width allows.
- *Agent (S36 choice):* the dialog dims the page with a Dark scrim at 85%; `✕` and Esc close it.
- *Agent (S36 choice):* the disclaimer text lives once, in the `video-player` component, so it cannot drift between dialog and stage.

## Open questions

None.

## Work required

- **S2** (Box), **S3** (Live), **S10** (Recap), **S19** (watched-game updates) — every room these stories build sits under this chrome: the `game-topbar` (← back returns to that day's scoreboard; `NYY @ BOS`; live dot + `LIVE` only while in progress; date) and scrollable top tabs whose set follows the phase (pre-game: no Live, no Recap; in progress: Live, no Recap; final: Recap when available, no Live). **No score and no team/score header module anywhere in the header.**
- **S3** / **S19**: the live indicator is an Accent 2 dot plus label, no pill; it appears only while the game is in progress.
- **Videos room** (built inside the game view by S2/S3/S10's shared game route, and by any story that ships Videos): two/three/four-column thumbnail grid by pairing plus a List mode; search, Filter, and the **Featured team** and **Stat / viz** facet chips; the player opens as a **dialog by default** and as a **persistent stage** when the user's Settings → Game detail → Video Player says so; the MLBAM disclaimer appears verbatim under the player in both.

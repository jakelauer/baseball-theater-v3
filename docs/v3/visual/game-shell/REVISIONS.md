# Game header, room chrome + Videos — Figma revisions (S36)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-10 — live file as edited and exported in the S36 session (the Plugin API cannot save a named version; no named version was taken).

Exports are 1× PNG renders of the frames with the same names. Node IDs are listed so a later session can find each frame.

## Revisions

| ID   | What changed | Exports |
| ---- | ------------ | ------- |
| R6   | `game-topbar` component: the filled red `LIVE` chip is now a dot plus label. The dot is Accent 2 (`color/status/live`) and the label is in Accent 2 type, with no background, padding or pill. Frames that aren't live hide the indicator, so it shows only while the game is in progress. | `game-phase-live-mobile.png` |
| R7   | `game-header-mobile` component: each team now reads as abbreviation plus record on one line (`NYY (94-58)`, `BOS (87-65)`), with the record in regular weight. The full-name line ("New York Yankees") is hidden. Every game frame inherits it. | `game-videos-grid-mobile.png`, `game-videos-grid-medium.png`, `game-videos-grid-desktop.png` |
| R10  | The Videos thumbnail grid's column count grows with the pairing: 2 on mobile, 3 on medium (it was 2), 4 on desktop (it was 2, "Double-Column Detail"). Every pairing gets a Grid/List toggle (selected segment in Primary) and a row of facet chips labeled **`Facet 1 (TBD)`, `Facet 2 (TBD)`, `Facet 3 (TBD)`**, beside the existing search and filter controls. The chips are placeholders: which filter fields ship first is still open (§9 "Videos sort / filter fields", S32). New list-mode frame (`447:5069`): the same clips as rows, small thumbnail plus title and meta. | `game-videos-grid-mobile.png`, `game-videos-grid-medium.png`, `game-videos-grid-desktop.png`, `game-videos-list-mobile.png` |
| R14b | Three phase frames, using the shared `room-tabs` instance with phase overrides. **Pre-game** (`447:4697`): Videos · Plays · Box, status `7:05 PM ET`, no score. **Live** (`447:4821`): Videos · Live · Plays · Box, status `Bot 7`, live indicator on. **Final** (`447:4945`): Videos · Plays · Box · Recap. Live and Recap never appear together. The existing final-phase game frames now hide the Live tab. | `game-phase-pregame-mobile.png`, `game-phase-live-mobile.png`, `game-phase-final-mobile.png` |
| R15  | New `video-player` component (`448:4176`): stage (the highlight still), Primary play control, progress bar and time, title, then the MLBAM disclaimer under the player. Both open alternatives from O3 are drawn and stay labeled on the canvas as "Alternative A — dialog overlay (O3, Open)" and "Alternative B — persistent stage (O3, Open)", at mobile and medium. Neither is chosen; S32 decides. | `video-player-dialog-mobile.png`, `video-player-stage-mobile.png`, `video-player-dialog-medium.png`, `video-player-stage-medium.png` |
| R18  | Renamed the game-shell frames ending in `-dark`: `game-header-videos-mobile-dark` → `game-videos-grid-mobile`, `game-header-videos-medium-dark` → `game-videos-grid-medium`, `game-header-videos-desktop-dark` → `game-videos-grid-desktop`, `game-hidden-score-mobile-dark` → `game-hidden-score-mobile`. Every new frame ends in a pairing. `live-mobile-dark` (Live room, S37) and the Standings/Search/Settings `-dark` frames (S38) are left to their stories. | `game-videos-grid-mobile.png`, `game-hidden-score-mobile.png` |

## Player disclaimer

The player frames show this text under the player, verbatim from VISUAL-DESIGN §6 Videos:

> DISCLAIMER:
> This video is provided by MLBAM and MLB.com and has no affiliation with or connection to Baseball Theater. It has been displayed on your device via a public API provided by Major League Baseball.

The text lives once in the `video-player` component (`disclaimer-text` layer). Every player frame is an instance of it, so the copy can't drift between placements.

## Choices made while applying (for the owner to check before S32 ratifies)

- The top-bar live indicator reads `LIVE` and the header status row reads the inning (`Bot 7`). On frames that aren't live, the indicator is hidden instead of showing "Final" a second time.
- The header record uses the same records as the scoreboard frames (S35), so the two surfaces agree.
- `game-hidden-score-mobile` follows the owner's S35 rule for hidden records: `NYY (▒▒-▒▒)`.
- Pre-game status uses the existing header status style (`7:05 PM ET`). The scoreboard colors scheduled times in Accent, but that header style wasn't recolored here.
- The dialog alternative dims the page with a Dark scrim at 85%. Esc/close is the `✕` in the dialog's corner.
- Mobile shows two facet chips and medium/desktop show three, sized to fit the row. The number of facets is not a decision.

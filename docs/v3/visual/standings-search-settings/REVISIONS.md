# Standings, Search + Settings — Figma revisions (S38)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-13 — live file as edited and exported in the S38 session (the Plugin API cannot save a named version; no named version was taken).

Exports are 1× PNG renders of the frames with the same names. Frame node IDs: `settings-mobile` `190:3287`, `settings-medium` `476:4384`, `settings-desktop` `476:4444`, `standings-mobile` `190:3080`, `standings-medium` `476:4515`, `standings-desktop` `476:4724`, `search-mobile` `198:2952`, `search-medium` `476:4968`, `search-desktop` `5:1770`.

## Revisions

| ID   | What changed | Exports |
| ---- | ------------ | ------- |
| R13  | Settings is grouped by site area: **Game list**, **Game detail**, **Account**. Game list holds the game-row slot control (the Status / Room Menu / Win Probability radio, which was there before under "How It Looks" with no label; it is now labeled "Game-Row Slot"), the collapse non-favorites toggle, and Hide Scores. **Hide Scores is in Game list by owner decision** (asked in the S38 session; the item text and VISUAL-DESIGN didn't place it). Game detail holds the room that opens first (Videos / Live / Box, labeled "Opens First"). Account is unchanged. The "How It Looks" and "What Is Hidden" groups are gone. | `settings-mobile.png`, `settings-medium.png`, `settings-desktop.png` |
| R17b | New medium (768px, no rail) and desktop (the same medium canvas beside the 240px `nav-rail`, 1008px) frames for each screen, built the way `scoreboard-medium` / `scoreboard-desktop` are. Settings medium uses two columns of the same groups (Game list left; Game detail and Account right). Standings medium is the mobile tables at full width. Search medium is the mobile search with the results in a three-across card grid. `search-desktop` was redrawn as rail plus the medium canvas (it was a 1280px frame with its own layout). | `settings-medium.png`, `settings-desktop.png`, `standings-medium.png`, `standings-desktop.png`, `search-medium.png`, `search-desktop.png` |
| R18  | Renamed `settings-mobile-dark` → `settings-mobile`, `standings-mobile-dark` → `standings-mobile`, `search-mobile-dark` → `search-mobile`, `search-desktop-dark` → `search-desktop`. No frame in the file now ends in `-dark` or `-light`. | `settings-mobile.png`, `standings-mobile.png`, `search-mobile.png`, `search-desktop.png` |

## Choices made while applying (for the owner to check before S34 ratifies)

- Settings medium/desktop use two columns. VISUAL-DESIGN §5a allows one or two columns.
- Standings medium/desktop keep one column of division tables, widened. The team name column takes the extra width.
- Search medium/desktop reuse the card grid the old desktop frame had, not a new layout.

## Seen but not changed (outside S38's revisions)

- Search results are photo cards. VISUAL-DESIGN §5 says search results are typographic rows, not a photo gallery.
- The `nav-rail` component always shows Scoreboard as active, so the Standings and Settings desktop frames highlight the wrong item. On `search-desktop`, both Scoreboard and Search are highlighted.
- The Settings, Standings and Search frames (mobile, and the medium/desktop frames built from them) use a raw background color, not the background token the scoreboard frames use.

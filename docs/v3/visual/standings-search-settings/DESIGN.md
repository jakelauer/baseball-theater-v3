# Standings, Search + Settings — design (S34)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-14 — live Figma file as edited and exported in the S31–S34 design session (the Plugin API cannot save a named version; no named version was taken).

Frame revisions before this session are logged in [`REVISIONS.md`](./REVISIONS.md) (S38, 2026-10-13). This session redrew search results as typographic rows, added the Video Player control to Settings, and pointed each desktop frame's rail at its own section, then re-exported the affected frames.

## Frames

Every export is a 1× PNG of the Figma frame with the same name. Medium is the standalone page (no rail); desktop is the medium canvas beside the 240px nav rail.

| Export | Pairing | What it shows |
| ------ | ------- | ------------- |
| `standings-mobile.png` | mobile | Standings: AL East, AL Central, AL West tables — team (color swatch + name), abbreviation, W, L, PCT, GB. |
| `standings-medium.png` | medium | Same division tables in one column, widened; the team column takes the extra width. |
| `standings-desktop.png` | desktop | Same, beside the rail with **Standings** active. |
| `search-mobile.png` | mobile | Search: input, active filter chips (All Dates · NYY · Home Runs), result count, results as **typographic rows** (video icon, title, `Highlight · date`, matchup as color swatch + abbreviation). |
| `search-medium.png` | medium | Same, rows full width. |
| `search-desktop.png` | desktop | Same, beside the rail with **Search** active. |
| `settings-mobile.png` | mobile | Settings in one column, grouped by site area. **Game List:** Favorite Teams dropdown (`NYY, BOS`), **game-row slot** (Status / Room Menu / Win Probability), **collapse non-favorites** toggle, Hide Scores toggle. **Game Detail:** Opens First (Videos / Live / Box), Video Player (Dialog / Stage, Dialog selected). **Account:** Sign in with magic link, Connect Patreon. |
| `settings-medium.png` | medium | Same groups in two columns: Game List left; Game Detail and Account right. |
| `settings-desktop.png` | desktop | Same, beside the rail with **Settings** active. |

## Decisions

Recorded as the owner stated them.

- **Settings grouping** (VISUAL-DESIGN §5a, already Accepted; applied in S38 R13): Game list · Game detail · Account. The **game-row slot** and **collapse non-favorites** controls are under Game list.
- **Hide Scores** goes in **Game list** (owner, 2026-10-13, S38: "Game list").
- **Video Player** setting (owner, 2026-10-13: "Configurable by the user, defaulting to the dialog overlay"; placement 2026-10-14: "Game detail group"): a Dialog / Stage choice under Game detail, Dialog by default.
- **Favorites** (owner, 2026-10-14): "It's just a dropdown in settings, not a big deal." Drawn as a Favorite Teams dropdown at the top of Game List.
- **Nav-rail active item** (owner, 2026-10-14, approved the fix): each desktop frame highlights its own section.

## Interpretation

The agent's reading of things the frames show that no decision states. Each is the agent's, for the owner to confirm by ratifying.

- *Agent:* search results were photo cards; VISUAL-DESIGN §5 ("typographic rows … not a photo gallery") and §6 (no photo faces on Search) already settle that, so this session swapped in the file's existing `search-result-row` / `search-result-row-desktop` components. No new design.
- *Agent:* the favorites dropdown sits at the top of **Game List**, since favorites drive that list's collapse and emphasis; its closed state shows the chosen abbreviations. The owner named no group — this placement is the agent's.
- *Agent:* the Video Player control is a radio pair in the same style as Opens First, labeled "Video Player", Dialog first.
- *Agent (S38 choice):* Settings medium/desktop use two columns (§5a allows one or two). Standings medium/desktop keep one widened column of tables.
- *Agent:* each sample search row reads `NYY @ BOS` and `Sep 21, 2026`; that is sample data.
- *Agent:* the slot options list Status, Room Menu and Win Probability; the scoreboard frames also draw Pitchers and Count occupants (S31). The setting offers whatever occupants the slot library has.

## Open questions

None.

## Work required

- **S4** (Standings): division tables as drawn — team color swatch + name, abbreviation, W, L, PCT, GB; one column at every pairing, widening on medium/desktop.
- **S5** (Search): input, filter chips, result count, and typographic result rows (icon, title, kind + date, matchup as swatch + abbreviation) — no thumbnails or photo cards.
- **S6** (Settings favorites): build Settings grouped Game List · Game Detail · Account as drawn — one column on mobile, two on medium/desktop. Game List: Favorite Teams dropdown, game-row slot, collapse non-favorites, Hide Scores. Game Detail: Opens First, Video Player (Dialog default / Stage). Account: magic-link sign-in, Connect Patreon. Changing a control updates the UI without a reload.
- **Shell** (whichever story ships the desktop rail): highlight the active section with the `nav-rail` `Active` variant.

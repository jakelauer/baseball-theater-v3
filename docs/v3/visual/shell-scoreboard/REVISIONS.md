# Shell + scoreboard — Figma revisions (S35)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-10 — live file as edited and exported in the S35 session (the Plugin API cannot save a named version; no named version was taken).

Exports are 1× PNG renders of the frames with the same names. Node IDs are listed so a later session can find each frame.

## Revisions

| ID   | What changed | Exports |
| ---- | ------------ | ------- |
| R6   | Already conformant: the live row shows an Accent 2 dot plus the `Bot 7` label, with no background, pill or chip. No edit. The blink is motion, so it can't show in a still. | `scoreboard-mobile.png`, `scoreboard-medium.png`, `scoreboard-desktop.png` |
| R7   | `Rich Scoreboard Module` final and live variants: the line under each team name is now the abbreviation plus record (`NYY (94-58)`, `BOS (87-65)`, `LAD (98-54)`, `SD (85-67)`). Every scoreboard instance inherits it. The scheduled row is unchanged, because R7 covers rows where scores show. | `scoreboard-mobile.png`, `scoreboard-medium.png`, `scoreboard-desktop.png` |
| R8   | Already conformant: the venue (`American Family Field`) appears only on the scheduled row. Live and final rows carry none. No edit. | `scoreboard-mobile.png`, `scoreboard-medium.png` |
| R9   | The error description ("Check your connection and try again") is now bound to Primary. Before, it was a local muted cream hex. The title and Retry were already Primary. Every size inherits it. | `scoreboard-error-mobile.png`, `scoreboard-error-medium.png`, `scoreboard-error-desktop.png` |
| R14a | `Modular Block` (the slot library) gains an `Occupant` property. The existing variants are now `Count`, `Pitchers` and `Win Probability`. New `Occupant=Room menu` variants show a link stack per phase: pre-game Videos · Plays · Box. In progress: Videos · Live · Plays · Box. Final: Videos · Plays · Box · Recap. Live and Recap never appear together. Showcase frame `438:3315`. | `scoreboard-slot-room-menu-mobile.png` |
| R16  | New `notice-banner` component (`438:2959`): Dark ground, hairline border, cream message, Primary `Reload` action, muted dismiss `✕`, no accent fill. It sits directly under the header in the new shell frames. | `shell-notice-mobile.png`, `shell-notice-medium.png`, `shell-notice-desktop.png` |
| R17a | Medium (no rail) and desktop (the medium frame plus the nav rail) frames for the empty, loading, error, scores-hidden and collapsed states, next to the existing mobile ones. Scores-hidden and collapsed use the same module instances in a two-column wrap. | `scoreboard-empty-medium.png`, `scoreboard-empty-desktop.png`, `scoreboard-loading-medium.png`, `scoreboard-loading-desktop.png`, `scoreboard-error-medium.png`, `scoreboard-error-desktop.png`, `scoreboard-scores-hidden-medium.png`, `scoreboard-scores-hidden-desktop.png`, `scoreboard-collapsed-medium.png`, `scoreboard-collapsed-desktop.png` |
| R18  | Every shell and scoreboard frame name ends in `mobile`, `medium` or `desktop`. None ended in `-dark`, so nothing was renamed, and every new frame follows the rule. The `-dark` frames on other surfaces belong to S36–S38. | `scoreboard-empty-mobile.png`, `scoreboard-loading-mobile.png`, `scoreboard-scores-hidden-mobile.png`, `scoreboard-collapsed-mobile.png` |

## Owner follow-up (2026-10-10)

The owner reviewed `scoreboard-scores-hidden-mobile` and said the score cells read as missing: *"the record should show those full block characters that are kinda semi opaque, and the hidden scores should be dashes."* Applied to all three scores-hidden frames and re-exported (`scoreboard-scores-hidden-mobile.png`, `scoreboard-scores-hidden-medium.png`, `scoreboard-scores-hidden-desktop.png`):

- The R / H / E cells show a muted `–` (bound to `color/text/muted`) instead of an invisible numeral.
- Each record line shows the abbreviation, then the record as semi-opaque full blocks, e.g. `NYY (██-██)`. The blocks are Light at 30%. They apply to every row, scheduled included, so the hidden state treats every record the same way.
- Token debt: the 30% block fill is a local paint (`#FFF2D3` at 0.3), not a variable binding. The Plugin API drops the paint opacity when a variable is bound to a character range inside an instance. A designer can fix it in Figma, for example with a `color/text/redacted` variable.

## Choices made while applying (for the owner to check before S31 ratifies)

- Room-menu links are plain underlined Light text at Label size, with a 4px gap. The item text says only "a stack of links".
- The notice banner's copy is a placeholder ("A new version of Baseball Theater is available."), and its action is a Primary text link, not a button.
- The team-color contrast of names such as `YANKEES` and `PADRES` on Dark is not addressed. It belongs to §9 "How strongly team color paints a module", which S31 owns.

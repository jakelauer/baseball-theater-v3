# App shell + scoreboard — design (S31)

## Source

https://www.figma.com/design/wqGKEFlvyxq0ObWZhRJdPF

Version: 2026-10-14 — live Figma file as edited and exported in the S31–S34 design session (the Plugin API cannot save a named version; no named version was taken).

Frame revisions before this session are logged in [`REVISIONS.md`](./REVISIONS.md) (S35, 2026-10-10). This session changed the `Rich Scoreboard Module` (team color as an edge only) and made `nav-rail` a component set with an `Active` property, then re-exported every frame that shows a game module or the rail.

## Frames

Every export is a 1× PNG of the Figma frame with the same name.

| Export | Pairing | What it shows |
| ------ | ------- | ------------- |
| `scoreboard-mobile.png` | mobile | Header (burger · wordmark · account), date control, one column of full game modules: final (slot occupant: pitchers of record), live (`Bot 7` dot + label; slot occupant: count), scheduled (venue, probable pitchers; slot occupant: win probability). Team color is a 4px edge beside each team; names in Light. Day highlights digest below: dull-gold items with the clip's thumbnail, rank, title, duration, and the Accent `WATCH FIRST` tag on the top clip. |
| `scoreboard-medium.png` | medium | Same modules in a two-column canvas, no rail. |
| `scoreboard-desktop.png` | desktop | The medium canvas beside the 240px nav rail (Scoreboard active). |
| `scoreboard-collapsed-mobile.png` | mobile | Collapse non-favorites: one favorite as the full module, non-favorite games as the smaller bar (color swatch + abbreviation, `Collapsed` label). |
| `scoreboard-collapsed-medium.png` | medium | Same, two-column wrap. |
| `scoreboard-collapsed-desktop.png` | desktop | Same plus rail. |
| `scoreboard-scores-hidden-mobile.png` | mobile | Hide scores: R/H/E cells show muted `–`, records show shade blocks (`NYY (▒▒-▒▒)`), with a "Scores hidden in settings" line. |
| `scoreboard-scores-hidden-medium.png` | medium | Same, two-column wrap. |
| `scoreboard-scores-hidden-desktop.png` | desktop | Same plus rail. |
| `scoreboard-slot-room-menu-mobile.png` | mobile | Right-hand slot with the **room menu** occupant: per-phase link stacks (pre-game Videos · Plays · Box; in progress Videos · Live · Plays · Box; final Videos · Plays · Box · Recap). |
| `scoreboard-empty-mobile.png` | mobile | Empty state: one muted sentence, "No games scheduled for this date." |
| `scoreboard-empty-medium.png` | medium | Same. |
| `scoreboard-empty-desktop.png` | desktop | Same plus rail. |
| `scoreboard-loading-mobile.png` | mobile | Loading: page title kept, centered loader. |
| `scoreboard-loading-medium.png` | medium | Same. |
| `scoreboard-loading-desktop.png` | desktop | Same plus rail. |
| `scoreboard-error-mobile.png` | mobile | Error: Primary "Couldn't load games", recovery hint, Retry. |
| `scoreboard-error-medium.png` | medium | Same. |
| `scoreboard-error-desktop.png` | desktop | Same plus rail. |
| `shell-notice-mobile.png` | mobile | App-level notice slot directly under the header (`notice-banner`: message, Primary `Reload`, dismiss `✕`) above the scoreboard. |
| `shell-notice-medium.png` | medium | Same. |
| `shell-notice-desktop.png` | desktop | Same plus rail. |

Slot occupants drawn: pitchers of record (final row), count (live row), **win probability** (scheduled row), and the **room menu** (`scoreboard-slot-room-menu-mobile.png`). Game status itself (time / live / final) sits at the top-left of every row, so no frame draws status as the slot occupant.

## Decisions

Recorded as the owner stated them.

- **How strongly team color paints a module** (VISUAL-DESIGN §9): **edge / swatch only.** Owner's choice (2026-10-13): "Edge/swatch only" — team color only on a 4px edge bar or swatch; names and abbreviations in Light text.
- **Letterform favicon** (VISUAL-DESIGN §9): the favicon is **the logo (flag)** — owner's words, 2026-10-13: "The logo (flag)." It is BT's own flag mark from the wordmark, not a team mark.
- **Dark** (owner, 2026-10-14): "I decided I also prefer #10100F as the dark background color." Set on the Figma `Dark` variable; every page ground follows it.
- **Raised surfaces** (owner, 2026-10-14): cards and modules are a lifted neutral, then "the lifted gray over the background is too cool, I want to warm it up juuuust slightly" — `color/bg/raised` = `#1C1A19`.
- **Raised current** (owner, 2026-10-14): "we need another MORE lifted color for things that are 'current' but already lifted, like the expanded accordion items" — `color/bg/raised-current` = `#272422`.
- **Red on Dark** (owner, 2026-10-14): "there are some places we're showing red on black, which is not enough contrast." Red text and thin red marks use **Primary Light** `#FF5247` (`color/text/brand`); filled red (buttons, active nav, selected inning) keeps Primary.
- **Unbound colors** (owner, 2026-10-14): muted text — "Do what you think is most logical" (see Interpretation); thumbnail overlays — "Light on Dark 50%"; pitch outcomes — "Balls are usually green, strikes red, in play blue."
- **Day digest** (owner, 2026-10-14): "I want the background to be a dull amber, enough to tell that it's 'gold' and with a little diagonal double light gradient to simulate gold, but still quite dark so the light text is contrasty"; "those should have the video thumbnail"; "they should also have spacing between them and border radii."
- **Hidden scores** (S35 follow-up, 2026-10-10): "the record should show those full block characters that are kinda semi opaque, and the hidden scores should be dashes" — and the block is "the character that is a full block but checkerboard or something. It's not literally transparent, but it has that illusion." Drawn as `▒` (U+2592) records and muted `–` score cells.

Host pairings, the game-row slot, and collapse non-favorites were already **Accepted** in VISUAL-DESIGN and are not reopened here.

## Interpretation

The agent's reading of things the frames show that no decision states. Each is the agent's, for the owner to confirm by ratifying.

- *Agent:* the team-color edge is 4px wide, the height of the team row (36px), with 1px rounding — the same proportion as the game header and search rows. Scheduled rows use the same edge.
- *Agent:* the favicon is the flag shape alone (no `BT` letters), on the Dark ground. The frames contain no favicon drawing; S28/S20 should export it from the `wordmark` component.
- *Agent (S35 choice):* room-menu links are plain underlined Light text at Label size, 4px apart.
- *Agent (S35 choice):* the notice copy ("A new version of Baseball Theater is available.") is placeholder; the action is a Primary text link, not a button.
- *Agent:* the digest gold is a linear gradient at about 30° — base `#3A2A0E`, two soft highlights (`#56401A`, `#4E3916`), darkest `#2E220B` — so Light text stays above 8:1 everywhere on it. Each item shows the clip's 80×45 still (6px radius) between the rank and the title; items have an 8px radius and 8px gaps inside a 16px gutter.
- *Agent:* every page ground, card and hairline in the file is now bound to a variable (`color/bg/page`, `color/bg/raised`, `color/border/*`, `color/text/*`). Team colors stay raw — they are data — and the batter illustration keeps its own greys.
- *Agent (delegated by the owner):* muted text has one level — `color/text/muted`, Light at 50%. The former 30% secondary lines and the warm grey `#B9AAA4` both use it.
- *Agent:* `Primary Light` `#FF5247` is ~5.9:1 on Dark and ~5.4:1 on Raised; Primary `#CE0F0F` on Dark is ~3.3:1, which is why text moved off it.
- *Agent:* `nav-rail` now has an `Active` variant property (Scoreboard · Standings · Search · Settings); the scoreboard frames use `Active=Scoreboard`.
- *Agent:* some team colors (Padres brown, Yankees navy) are dark against Dark even as an edge. Per VISUAL-DESIGN §3, the build lightens a derived value at the data/theme boundary; the frames show the raw colors.

## Open questions

None.

## Work required

- **S20** (scoreboard live refresh): build the scoreboard from these frames — date control, one column on mobile and two on medium/desktop of the same `Rich Scoreboard Module`; team color as a 4px edge only, names/abbreviations/scores in Light; the right-hand slot reads its occupant from the game-row slot setting (pitchers, count, win probability, room menu — and status, which no frame draws as an occupant; build it in the same block); collapsed non-favorite bars; hidden-score cells (`–`) and records (`▒▒-▒▒`, check a font fallback draws U+2592); empty, loading and error exactly as drawn; the live row's Accent 2 dot blinks.
- **S28** (version sunset / stale-client upgrade): the upgrade prompt is the `notice-banner` in the app-level notice slot directly under the header, at every pairing, with a Primary `Reload` action and a dismiss `✕`.
- **Theme code** (S20 or S28, whichever ships UI first): update the theme to these tokens — `--bt-dark` `#10100F` (today `web/src/styles.css` still has `#211819`), Raised `#1C1A19`, Raised current `#272422`, Primary Light `#FF5247` for red text, muted = Light 50%, pitch roles ball/strike/in-play.
- **S28 / S20** (whichever ships the shell first): the favicon is the BT flag mark from the `wordmark` component; the desktop rail highlights the active section with the `nav-rail` `Active` variant (path prefix).

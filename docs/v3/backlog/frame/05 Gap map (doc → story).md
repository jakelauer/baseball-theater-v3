## Gap map (doc → story)

| Doc item | Stories |
|----------|---------|
| MLB upstream types + client + fixtures + drift | **S11–S15** (build first) |
| Full-fidelity upstream types (coverage gate) | **S23** (then S13 / S15 reuse the helper) |
| Post-game replay / diffPatch capture | **S22** |
| Ingest → durable BT projections | **S21**, then **S16–S17** |
| ADR-002 live delivery + watched UI | **S18–S20** |
| Brand theme + cascading color (VISUAL-DESIGN §3) | **S24** (tokens; before UI fill). Dark-only lock is a Later theme — S24 shipped `auto` |
| Visual design per surface + §9 open decisions (VISUAL-DESIGN §5–§9) | **S31** shell + scoreboard (§9: team-color strength, favicon), **S32** game header (incl. ← back) + room chrome + Videos (§9: mobile room chrome, video dialog vs stage), **S33** Live/Box/Recap — Live is the pitch theater (§9: default open at-bat), **S34** Standings/Search/Settings (no §9 row) — owner-approved; gate the UI stories (rule 18) |
| Typed BT API boundary (route → response, both ends) | **S26** (before S25) |
| API versioning + OpenAPI + breaking-change gate (ADR-015) | **S26** (`/api/v1` paths), **S27** (spec + oasdiff), **S28** (sunset / stale client) |
| Spec-fidelity gate (ADR-016) | **S29** (after S27 + S25) — generated response types + mutual-assignability gate, which is ADR-016's stated value ("proof that the spec is faithful") |
| Generated client **DAL** (`openapi-fetch`) (ADR-016) | Later themes — *Generated DAL adoption*, split out of S29 by the 2026-09-16 review and held behind a named trigger (no external consumer exists). **ADR-016 describes it as the end state, so the ADR and the code are knowingly out of step until the trigger fires — whether ADR-016 wants an amendment saying so is the owner's call** |
| Internal API explorer / swagger UI (FEATURES carry, internal-only) | Later themes — no story owns it; S27 put publishing the spec out of scope and ADR-015 lists it as "Still open" |
| Client state / typed read cache (ADR-014) | **S25** (before UI fill and S18–S20) |
| Figma file trails VISUAL-DESIGN (review against FIGMA-EXPLORATION + owner decisions after it) | **S35** shell + scoreboard (R6–R9, R14a, R16, R17a, R18), **S36** game header + tab bar + Videos + player (R6, R7, R10, R14b, R15, R18), **S37** Live/Box/Recap (R6–R8, R11, R12, R18), **S38** Standings/Search/Settings (R13, R17b, R18) — each feeds S31–S34. **R1–R5** were minor design fixes already made in the Figma file (owner, 2026-10-08) — no revision item. |
| Accepted VISUAL-DESIGN items with **no build story** (2026-10-04 review) | Live pitch theater (diamond, BSO pips, win-probability chart, pitcher/batter cards, zone + trajectory moved from Plays, newest-first accordion — **S3** adds only the count); phase-aware tab bar (Live/Recap never together); scoreboard right-hand slot + collapsed non-favorite bar and their Settings (**S6** defers them to "a later story"); Videos thumbnail grid/list toggle + search/filter when not featured; ← back on the game header; linescore on Plays and Recap. All gated on **S31–S33** once sliced (rule 18). §9 "Videos sort / filter fields" (**Open**; candidates in §6 Videos) is decided by **S32** |
| Scoreboard → game loop UI | S2–S3, S10, S19–S20 (**after** S21 shapes + prefer **S24**; gated on **S31–S33**) |
| Standings | S4 (after S13 + S21; prefer S24; gated on **S34**) |
| Search | S5 (prefer S24; typographic results; gated on **S34**) |
| Settings | S6 (no presentation-profile layer; gated on **S34**) |
| BT-backed data / ports | S7, S9 |
| Auth G3 | S8 (+ later Patreon) |
| Plays / pitch viz | Pitch theater is **Live** (**S33**). Plays remains a historical-list room; a future Plays restyle still needs its own design story (rule 18). §9 “Pitch accordion default” is **Accepted** (newest at top, most recent expanded) — no story decides it |
| Sign-in / account UI (VISUAL-DESIGN §6 Settings & auth) | **S34** draws Settings' account section; no story builds sign-in UI (**S8** is ports only). A future sign-in UI story needs its own design story (rule 18) |
| VISUAL-DESIGN later (AppShell rail chrome in code, §9 no-spoilers for free-text titles — **Open (product)**, FEATURES decides first) | Later themes — team-color strength and favicon belong to **S31**; host pairings are already **Accepted** (mobile / medium / desktop) |
| AI / multi-source / FCM push | Later themes |

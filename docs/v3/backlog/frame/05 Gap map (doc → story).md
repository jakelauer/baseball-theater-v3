## Gap map (doc → story)

| Doc item | Stories |
|----------|---------|
| MLB upstream types + client + fixtures + drift | **S11–S15** (build first) |
| Full-fidelity upstream types (coverage gate) | **S23** (then S13 / S15 reuse the helper) |
| Post-game replay / diffPatch capture | **S22** |
| Ingest → durable BT projections | **S21**, then **S16–S17** |
| ADR-002 live delivery + watched UI | **S18–S20** |
| Brand theme + cascading color (VISUAL-DESIGN §3) | **S24** (before UI fill) |
| Visual design per surface + §9 open decisions (VISUAL-DESIGN §5–§9) | **S31** shell + scoreboard (§9: team-color strength, host pairing, favicon), **S32** game header + room chrome + Videos (§9: compact room chrome, video dialog vs stage), **S33** Live/Box/Recap rooms (no §9 row), **S34** Standings/Search/Settings (no §9 row) — owner-approved; gate the UI stories (rule 18) |
| Typed BT API boundary (route → response, both ends) | **S26** (before S25) |
| API versioning + OpenAPI + breaking-change gate (ADR-015) | **S26** (`/api/v1` paths), **S27** (spec + oasdiff), **S28** (sunset / stale client) |
| Generated client DAL + spec-fidelity gate (ADR-016) | **S29** (after S27 + S25) |
| Client state / typed read cache (ADR-014) | **S25** (before UI fill and S18–S20) |
| Scoreboard → game loop UI | S2–S3, S10, S19–S20 (**after** S21 shapes + prefer **S24**; gated on **S31–S33**) |
| Standings | S4 (after S13 + S21; prefer S24; gated on **S34**) |
| Search | S5 (prefer S24; typographic results; gated on **S34**) |
| Settings | S6 (no presentation-profile layer; gated on **S34**) |
| BT-backed data / ports | S7, S9 |
| Auth G3 | S8 (+ later Patreon) |
| Plays / pitch viz | Done at baseline. **No design story** — none needed while no story builds or restyles the Plays room; a future Plays-room story needs one (rule 18), and that design story owns §9 “Default open at-bat” |
| Sign-in / account UI (VISUAL-DESIGN §6 Settings & auth) | **S34** draws Settings' account section; no story builds sign-in UI (**S8** is ports only). A future sign-in UI story needs its own design story (rule 18) |
| VISUAL-DESIGN later (AppShell variant chrome in code, host pairing beyond the default, §9 no-spoilers for free-text titles — **Open (product)**, FEATURES decides first) | Later themes — the *decisions* on team color and host pairing belong to **S31** |
| AI / multi-source / FCM push | Later themes |

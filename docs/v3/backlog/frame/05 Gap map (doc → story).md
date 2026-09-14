## Gap map (doc → story)

| Doc item | Stories |
|----------|---------|
| MLB upstream types + client + fixtures + drift | **S11–S15** (build first) |
| Full-fidelity upstream types (coverage gate) | **S23** (then S13 / S15 reuse the helper) |
| Post-game replay / diffPatch capture | **S22** |
| Ingest → durable BT projections | **S21**, then **S16–S17** |
| ADR-002 live delivery + watched UI | **S18–S20** |
| Brand theme + cascading color (VISUAL-DESIGN §3) | **S24** (before UI fill) |
| Visual design per surface + §9 open decisions (VISUAL-DESIGN §5–§9) | **S31** shell + scoreboard, **S32** game header + room chrome, **S33** Live/Box/Recap rooms, **S34** Standings/Search/Settings — owner-approved; gate the UI stories (rule 18) |
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
| Plays / pitch viz | Done at baseline |
| VISUAL-DESIGN later (AppShell variant chrome in code, host pairing beyond the default) | Later themes — the *decisions* on team color, host pairing, and no-spoilers titles now belong to **S31** / **S33** |
| AI / multi-source / FCM push | Later themes |

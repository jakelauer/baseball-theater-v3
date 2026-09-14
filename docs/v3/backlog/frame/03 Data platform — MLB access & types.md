## Data platform — MLB access & types

v2’s `baseball-theater-engine` (contracts + `MlbDataServer`) is **not** copied as a package — **do not reuse v2 source types**. Rebuild the *capability* behind ports: typed upstream payloads → mappers → BT domain → fixture + live adapters (ADR-001 / ADR-012). Do **not** reintroduce browser→proxy→MLB.

**Type design (required for S11+):**

- **Every nested object gets its own named type** — no inline `{ … }` object literals as field types in the exported `interface` / `type` definitions. (The zod parsers may nest `z.object(...)` inline as much as is convenient — runtime validation shape is not the constraint; the exported *types* are.) Inlining a type is allowed only where **specifically defensible** (a genuine one-off 1–2 field wrapper) and marked with a `// design-exception:` note.
- Names must reflect **purpose** (`PitchCoordinates`, `LiveGamePlayEvent`, `ScheduleGameTeam`, …), be **intelligently separable** into modules by concern (live feed, schedule, content, standings, players), and stay **usable** — no sprawling 60-character names, no 900 near-identical types. When shapes overlap, **compose**: `extends`, unions / discriminated unions, `Pick` / `Omit`, a shared base, or a small generic — whichever fits, not copy-paste variants.
- Upstream MLB types stay separate from BT product domain (`GameSnapshot`, etc.).
- Recorded payloads are modeled to near-total field coverage behind a mechanical gate (**S23**); unknown / newly seen fields stay discoverable (**S15**), never silently dropped without a report.

![[S11]]

---

![[S12]]

---

![[S23]]

---

![[S13]]

---

![[S14]]

---

![[S15]]

---

![[S22]]

---

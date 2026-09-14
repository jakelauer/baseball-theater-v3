# Backlog → Obsidian vault migration

**Purpose:** Make the backlog browsable as individual story notes with table/board views in [Obsidian](https://obsidian.md), without giving up what the loop relies on `BACKLOG.md` for: status committed atomically with code, story specs recoverable from git history, AC edits visible in diffs, and graders that read a file offline.

**Why staged:** Each stage leaves the repo in a working state and can be the last one. Nothing in the main loop changes until **V3**, and V3 only starts after an explicit human go-ahead.

This is a **process migration**, not product work. It has its own IDs (`V1`…), its own ledger, and does not count toward the main backlog's review debt.

## Status

| Order | Stage | Title | Status |
|-------|-------|-------|--------|
| 1 | [V1](#v1--generated-read-only-vault) | Generated read-only vault | `done` |
| 2 | [V2](#v2--byte-identical-round-trip) | Byte-identical round trip | `done` |
| 3 | [Checkpoint](#checkpoint--go--no-go-for-v3) | Human go / no-go for V3 | `done` — **go** (2026-09-13) |
| 4 | [V3](#v3--story-files-become-the-source) | Story files become the source | `done` |
| 5 | [V4](#v4--optional-slim-backlogmd) | *(optional)* Slim `BACKLOG.md` | not sliced |

## Invariants (every stage)

1. **Graders keep passing unmodified.** No `scripts/verify-S*.sh` is edited. Whatever `BACKLOG.md` looks like, these still match exactly as today:
   - Story status rows: `| <priority> | [S<N>](…) | <title> | \`<status>\` |` — graders grep the **priority number** (e.g. `^\| 9 \| \[S17\]`).
   - Story headings `### S<N> — <title>` in their **current file order** — graders use the *next* heading as a range end (e.g. `/^### S23 —/,/^### S13 —/`), so section order is data, not presentation.
   - `**Status:** \`<status>\`` lines inside each story section.
   - `scripts/audit.sh` title lookup (`^\| [0-9]+ \| \[S<N>\]`).
2. **No story's `/goal` line or Acceptance criteria text changes** as a side effect of this migration (CLAUDE.md `/goal` rule 4). Where a stage needs a story's fence to change, that goes through a main-loop backlog review, not this file.
3. **No network, no cloud, no new workspace package** (a new workspace package is a main-loop drift event).
4. **Tooling lives in `scripts/backlog-vault/`**, TypeScript run by Node 24's built-in type stripping (no build step, no new runtime dependency), tested with the root `vitest`.

## Rules

- **Grader first, shown red** — same as main-loop rules 7 and 9: each stage writes `scripts/verify-V<N>.sh` (using `scripts/lib/checks.sh`) and runs it against HEAD before implementing.
- **Ledger:** completion is captured with `BT_AUDIT_LEDGER=docs/v3/VAULT-MIGRATION-AUDIT.md BT_AUDIT_BACKLOG=docs/v3/VAULT-MIGRATION.md scripts/audit.sh story V<N>`, committed with the stage. Never hand-written.
- **One commit per stage**, status flipped in the table above in that commit. Don't start the next stage with the previous one uncommitted.
- **Don't start a stage while a main-loop story is `doing`** in `BACKLOG.md` — the generator reads that file and a half-edited story is the likeliest parse failure.
- **Stop and report** rather than loosening an invariant.

---

### V1 — Generated read-only vault

**Impact:** Before V1, browsing the backlog meant scrolling a 1,700-line file. After V1, you open a folder in Obsidian and get one note per story plus a sortable, filterable table — without changing how the backlog is edited or graded.

**Work**

0. Write `scripts/verify-V1.sh`; show it failing on HEAD.
1. `scripts/backlog-vault/parse.ts` — parse `BACKLOG.md` into: story status table rows, story sections (in file order), and the Current baseline table.
2. `scripts/backlog-vault/vault.ts` — render the vault; `scripts/backlog-vault/cli.ts` — write it to `.backlog-vault/`.
3. Root script `backlog:vault`; Husky `post-commit`, `post-merge`, `post-checkout` hooks run it.
4. Allow the one audit ledger override (`BT_AUDIT_LEDGER`, `BT_AUDIT_BACKLOG` env vars in `scripts/audit.sh`, defaulting to today's paths).

**Acceptance criteria** (checks `scripts/verify-V1.sh` performs)

1. `pnpm backlog:vault --out <dir>` (default `.backlog-vault/`; the grader uses a temp dir) exits 0 and writes `<dir>/stories/S<N>.md` for **exactly** the IDs that have a `### S<N> —` heading in `BACKLOG.md` (same set, same count).
2. Every story note has YAML frontmatter with `id`, `title`, `priority` (number), `status`, `order` (1-based position in `BACKLOG.md`), `section` (the enclosing `## ` heading), `depends_on` and `prefer_after` (lists of `"[[S<N>]]"` links, possibly empty — every `S<N>` mentioned on that line), `turn_cap` (the number on the `**Turn cap:**` line, else the `stop after N turns` number in the Goal condition, else `null`), and `scope_files` (list of the backticked paths on the `**Scope files:**` line). `priority` and `status` match the Story status table for **every** story; the optional fields match for spot-checked stories with each present and absent.
3. The note body contains the story section verbatim (from the line after its heading up to, not including, the next `---` / `## ` / `### ` line, trailing blank lines trimmed), preceded by a one-line "generated — edit `docs/v3/BACKLOG.md`" banner.
4. The generator **exits nonzero** (and writes nothing) when the status table and the story sections disagree: an ID in one but not the other, or a table status that differs from the section's `**Status:**` line. Proven by the colocated tests against fixture inputs.
5. Story notes and generated files are written read-only (mode `0444`); running the generator twice in a row succeeds and produces byte-identical output.
6. `.backlog-vault/Backlog.base` exists and defines a table view over the story notes sorted by `priority`, and `.backlog-vault/Baseline.md` holds the Current baseline table.
7. `.backlog-vault/` is gitignored: after running the generator, `git status --porcelain` shows nothing under it.
8. `.husky/post-commit`, `.husky/post-merge`, `.husky/post-checkout` exist, invoke the generator, and never fail the git operation (generator failure prints a warning, hook exits 0).
9. `scripts/audit.sh` honors `BT_AUDIT_LEDGER` / `BT_AUDIT_BACKLOG`, and with neither set behaves exactly as before (same default paths).
10. `pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts` exits 0.
11. Invariant 1: `docs/v3/BACKLOG.md` and every `scripts/verify-S*.sh` are unchanged since the stage's start commit.
12. `pnpm lint` exits 0 (the new TypeScript is linted like the rest of the repo).

**Needs human judgment** (not graded): open `.backlog-vault/` as a vault in Obsidian and confirm the Bases table renders and sorts. Record the result in the V1 commit message.

**Human check result (2026-09-13):** confirmed by the product owner — the vault opens and works in Obsidian. (The V1 commit `961ac5a` predates the check and says "pending"; this line is the record.)

**Out of scope:** adding the tests to `pnpm verify` or CI (that changes the verify gate — a main-loop drift event; deferred to V3).

---

### V2 — Byte-identical round trip

**Impact:** Before V2, the vault is a one-way copy. After V2, it's proven that the story notes hold *everything* in the backlog — regenerating `BACKLOG.md` from them reproduces it exactly — which is what makes it safe to let people edit the notes instead (V3).

**Work**

0. Write `scripts/verify-V2.sh`; show it failing on HEAD.
1. Extend the vault so it holds the non-story parts of `BACKLOG.md` too, as **frame notes** `frame/NN <heading>.md` — the file split at each `## ` heading, verbatim, with each story section replaced by an `![[S<N>]]` embed line (so a frame note renders its stories inline in Obsidian) and the status table rows replaced by one marker line.
2. `scripts/backlog-vault/assemble.ts` — vault files → `BACKLOG.md` text, reading **only** the rendered notes (never the source). CLI: `--backlog <file>` picks the source (default `docs/v3/BACKLOG.md`); `--roundtrip --to <file>` renders the vault in memory, assembles it into `<file>`, and exits nonzero if it differs from the source; `--from-vault <dir> --to <file>` assembles from a vault on disk.

**Acceptance criteria** (checks `scripts/verify-V2.sh` performs)

1. `pnpm backlog:vault --roundtrip --to <tmp>` exits 0, and the grader's own `cmp` of `<tmp>` against `docs/v3/BACKLOG.md` is byte-identical.
2. The same round trip is byte-identical for `docs/v3/BACKLOG.md` at each of the last **5** commits that touched it (read via `git show`, into a temp dir) — proves the parser isn't fitted to one snapshot.
3. The status table in the assembled output is **generated from story frontmatter** (`priority`, `status`, `table_title`, link anchor derived from the heading), sorted by priority, and still byte-identical — so V3 can drop the hand-sorting rule. Proven by tampering: in a rendered vault on disk, change one story's `priority` and one line of its body, `--from-vault` assemble, and see the row move to its new sorted position and the body edit appear.
4. If any `BACKLOG.md` edit was needed to make it parse, it is whitespace-only: `git diff -w --ignore-blank-lines <stage-start> -- docs/v3/BACKLOG.md` is empty.
5. Invariant 1 still holds: `scripts/verify-S*.sh` unchanged; every story status row, `### S<N> —` heading, and `**Status:**` line is unchanged since stage start.
6. The colocated vitest suite exits 0 and includes a round-trip test over a fixture exercising every optional story field.
7. `pnpm lint` exits 0.

---

### Checkpoint — go / no-go for V3

Stop here. Nothing above changed how the loop works; V3 does. Before starting it, the human decides, having used the V1 vault for a while:

- Is browsing enough (stop at V2), or is editing in Obsidian actually wanted (go to V3)?
- Is V4 (slimming `BACKLOG.md`) likely? If so, graders written from now on should read story files, not `BACKLOG.md`.

Record the decision in this file's status table, in its own commit.

**Decision (2026-09-13):** **go** — the product owner wants to edit stories in Obsidian. V4 not decided.

---

### V3 — Story files become the source

**Impact:** Before V3, the backlog is edited as one big file and Obsidian is read-only. After V3, each story is its own file you can edit in Obsidian (or anywhere); `BACKLOG.md` is rebuilt from them automatically and still committed, so every existing check and history view keeps working.

**Precondition:** the checkpoint recorded `go`; no main-loop story is `doing` (verified at stage start `f321c32`).

**Note format** (decided at stage start — Obsidian rewrites frontmatter whenever a property is edited, so notes must survive that, and no fact may live in two editable places):

- **Story note** `docs/v3/backlog/stories/S<N>.md` = YAML frontmatter + the story body. The body **omits** the `### S<N> — …` heading and the `**Status:** …` line; the build writes both into `BACKLOG.md` from frontmatter.
- **Authoritative frontmatter** (what you edit): `id` (must equal the file name), `title`, `table_title`, `priority`, `status`.
- **Derived frontmatter** (rewritten by every build; editing it does nothing): `section` and `order` (from where the frame embeds the story), `depends_on`, `prefer_after`, `turn_cap`, `scope_files` (from the body text).
- **Frame notes** `docs/v3/backlog/frame/NN <heading>.md` = verbatim text; an `![[S<N>]]` line places a story, `![[Backlog.base#All stories]]` places the status table. Adding a story = new story note + one embed line.
- Frontmatter is read with a real YAML parser (`yaml`, a root **dev** dependency — tooling, not product runtime; invariant 4 is about the latter) and written back in one canonical style, so an Obsidian edit is normalized on the next build.

**Commands**

- `pnpm backlog:build` — read the notes, rewrite them canonically (derived fields refreshed), write `docs/v3/BACKLOG.md`.
- `pnpm backlog:check` — the same in memory; exit 1 naming each file that `build` would change.
- `pnpm backlog:import` — recovery only: regenerate the notes from `BACKLOG.md` (how V3 creates them).
- `pnpm test:backlog` — the `scripts/backlog-vault` vitest suite.
- All accept `--dir <notes dir>` and `--backlog <file>` so graders and tests work on temp copies.

**Work**

0. Write `scripts/verify-V3.sh`; show it failing on HEAD.
1. New note format + YAML frontmatter; `build` / `check` / `import`; import the current backlog into `docs/v3/backlog/` (committed). Remove `.backlog-vault/`, its gitignore entry, the `backlog:vault` script, and the V1 post-commit/merge/checkout hooks; gitignore `docs/v3/backlog/.obsidian/`.
2. `BACKLOG.md` gains a first-line HTML comment saying it is generated from `docs/v3/backlog/` (lives in frame note 00, invisible when rendered).
3. `backlog:check` runs first inside `pnpm lint`, and `test:backlog` at the end of `pnpm test:coverage` — so `pnpm verify`, `pnpm build`, and CI (which already runs lint → test:coverage → build) all enforce them with **no `ci.yml` change**. *Amended mid-stage (2026-09-13, product owner's call):* the plan was two new `ci.yml` steps, but `scripts/verify-S15.sh` check 5 fails on any `.github/` change since `origin/main`, which would break invariant 1; wiring through the package scripts CI already calls keeps every old grader passing.
4. Husky pre-commit, after lint-staged: if anything under `docs/v3/backlog/` or `docs/v3/BACKLOG.md` is staged — when `BACKLOG.md` is staged **with no note changes**, refuse the commit unless its staged content is exactly what the notes build (a hand edit of the generated file); otherwise run `build` and re-stage `BACKLOG.md` plus the already-staged notes. *(Narrowed during implementation: comparing whenever `BACKLOG.md` was staged also rejected an honest note edit whose earlier build was still staged.)*
5. Reword BACKLOG rules 5, 13, 17 (in frame note 00), CLAUDE.md Agent/loop rules + `/goal` shorthand, `.claude/skills/backlog-review/SKILL.md`, `.claude/skills/verify/SKILL.md`: edit `docs/v3/backlog/`, run `backlog:build`, commit both; the status table is generated (no hand-sorting).
6. `CHANGELOG.md` entry.
7. Commit (V3 status `doing` — "awaiting review"), then run a main-loop **backlog review** with fresh context: V3 changes `pnpm verify` (a drift event) and every `todo` story's fence names `docs/v3/BACKLOG.md` but not `docs/v3/backlog/`. The fence edits happen in **that review's** `amended` commit, not here. V3 flips to `done` in a final commit carrying its ledger entry, after the review entry exists. (The only stage with more than one commit — the review has to see V3 at HEAD.)

**Acceptance criteria** (checks `scripts/verify-V3.sh` performs)

1. `docs/v3/backlog/stories/S<N>.md` exists for exactly the story IDs in `BACKLOG.md`; frame notes exist; `pnpm backlog:check` exits 0.
2. In a temp copy of `docs/v3/backlog/` + `BACKLOG.md`: set one story's `status` in its note → `backlog:check` exits nonzero; `backlog:build` → the regenerated `BACKLOG.md` shows the new status in **both** the table row and the section's `**Status:**` line, and `backlog:check` exits 0. Also, a note whose frontmatter was rewritten in Obsidian's style (block lists, unquoted strings) still builds, and `build` normalizes it.
3. Story note bodies contain no `### S<N> —` heading and no `**Status:**` line.
4. Root `package.json`: `lint` runs `backlog:check`, `test:coverage` runs `test:backlog`, and `verify` runs `lint` and `test:coverage`; `.github/workflows/ci.yml` still runs `pnpm lint` and `pnpm test:coverage` and is **unchanged** since stage start. *(Amended mid-stage — see Work item 3.)*
5. Every `scripts/verify-S*.sh` exits with the **same code as at stage start** (all 0 except `verify-S22.sh`, already 1 at `f321c32` — its check 8 fails on `web/` changes by later stories, unrelated to this migration). *(Post-stage, 2026-09-13: `verify-S15.sh` check 5 and `verify-S22.sh` check 8 were pinned to their own shipping commits so later stories can't age them into failure; S22 now exits 0 and the V3 grader expects every grader to pass.)*; `scripts/audit.sh story S26 --reverify --no-verify` against a temp ledger exits 0. `BACKLOG.md` grader-matched lines (status rows, story headings, `**Status:**` lines) are unchanged since stage start.
6. Rules 5, 13, 17 in `BACKLOG.md`, CLAUDE.md, and both skills name `docs/v3/backlog/` and `backlog:build`; none still says to keep the table **sorted** by hand.
7. `.husky/pre-commit` runs the build step and the hand-edit guard; the V1 `post-*` hooks, the `backlog:vault` script, and every `.backlog-vault` reference outside `docs/v3/VAULT-MIGRATION*.md` and `scripts/verify-V[12].sh` are gone; `git check-ignore docs/v3/backlog/.obsidian/workspace.json` succeeds.
8. `CHANGELOG.md` mentions the Obsidian backlog.
9. `pnpm exec eslint scripts/backlog-vault` exits 0 and `pnpm test:backlog` exits 0.
10. **Final commit only:** a review entry in `docs/v3/AUDIT.md` newer than the V3 work commit exists. (Fails until the review runs — expected on the first green-except-review run.)

**Note:** V1's and V2's graders are expected to fail after V3 — they grade `.backlog-vault/` and the banner-and-heading note format V3 replaces. Their ledger entries stand as the record of those stages.

---

### V4 — *(optional)* Slim `BACKLOG.md`

Not sliced. Only if the checkpoint said so and V3 has been lived with: stop generating full story bodies into `BACKLOG.md`, keeping rules, status table, reviews. This is the only stage that breaks old graders' `awk` ranges, so it would need either frozen grader copies of the old file or a grader-contract change — decide then.

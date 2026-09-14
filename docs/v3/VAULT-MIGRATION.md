# Backlog → Obsidian vault migration

**Purpose:** Make the backlog browsable as individual story notes with table/board views in [Obsidian](https://obsidian.md), without giving up what the loop relies on `BACKLOG.md` for: status committed atomically with code, story specs recoverable from git history, AC edits visible in diffs, and graders that read a file offline.

**Why staged:** Each stage leaves the repo in a working state and can be the last one. Nothing in the main loop changes until **V3**, and V3 only starts after an explicit human go-ahead.

This is a **process migration**, not product work. It has its own IDs (`V1`…), its own ledger, and does not count toward the main backlog's review debt.

## Status

| Order | Stage | Title | Status |
|-------|-------|-------|--------|
| 1 | [V1](#v1--generated-read-only-vault) | Generated read-only vault | `done` |
| 2 | [V2](#v2--byte-identical-round-trip) | Byte-identical round trip | `done` |
| 3 | [Checkpoint](#checkpoint--go--no-go-for-v3) | Human go / no-go for V3 | `todo` |
| 4 | [V3](#v3--story-files-become-the-source) | Story files become the source | `todo` |
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

---

### V3 — Story files become the source

**Impact:** Before V3, the backlog is edited as one big file and Obsidian is read-only. After V3, each story is its own file you can edit in Obsidian (or anywhere); `BACKLOG.md` is rebuilt from them automatically and still committed, so every existing check and history view keeps working.

**Precondition:** the checkpoint recorded `go`; no main-loop story is `doing`.

**Work**

0. Write `scripts/verify-V3.sh`; show it failing on HEAD.
1. Move story notes and frame notes into `docs/v3/backlog/` (committed); the Obsidian vault is that folder; remove `.backlog-vault/`, gitignore `.obsidian/workspace*`.
2. `BACKLOG.md` becomes generated-and-committed; `pnpm backlog:build` writes it, `pnpm backlog:check` fails if it's stale. Wire `backlog:check` and the vault test suite into `pnpm verify` **and** CI (authorized by this stage; nothing else in CI changes).
3. Reword BACKLOG rules 5, 13, 17, CLAUDE.md Agent/loop rules + `/goal` shorthand, `.claude/skills/backlog-review/SKILL.md`, `.claude/skills/verify/SKILL.md`: edit `docs/v3/backlog/`, run `backlog:build`, commit both. Drop the "keep the table sorted" rule (it's generated).
4. Husky pre-commit runs `backlog:build` when `docs/v3/backlog/` is staged, so a stale `BACKLOG.md` can't be committed.
5. Run a main-loop **backlog review** (fresh context) — V3 changes `pnpm verify` (a drift event) and every `todo` story's fence needs `docs/v3/backlog/` added. The fence edits happen in **that review's** `amended` commit, not here.
6. `CHANGELOG.md` entry.

**Acceptance criteria** (checks `scripts/verify-V3.sh` performs)

1. `docs/v3/backlog/stories/S<N>.md` exists for every story; `pnpm backlog:check` exits 0 at HEAD.
2. Editing one story's `status` in its note and running `pnpm backlog:check` exits nonzero until `pnpm backlog:build` is run (proven in a temp copy of the repo docs, not the working tree).
3. `pnpm verify` runs `backlog:check` and the vault tests (grep of root `package.json`); `.github/workflows/ci.yml` runs them; no other CI change (diff of `ci.yml` limited to those additions).
4. Every existing `scripts/verify-S*.sh` for a `done` story still exits 0 (grader contract allows <60s each; run the backlog-reading checks, or all graders if within budget), and `scripts/audit.sh story S26 --reverify --no-verify` against a temp ledger exits 0.
5. Rules 5, 13, 17 in the generated `BACKLOG.md`, CLAUDE.md, and both skills name `docs/v3/backlog/` and `backlog:build`; none still instruct hand-sorting the status table.
6. `.backlog-vault/` no longer referenced anywhere in the repo; `.gitignore` covers `.obsidian/workspace*`.
7. `pnpm verify` exits 0.
8. A backlog review entry dated on/after this stage exists in `docs/v3/AUDIT.md` (it may land in the following commit; the stage is `done` only once it does).

---

### V4 — *(optional)* Slim `BACKLOG.md`

Not sliced. Only if the checkpoint said so and V3 has been lived with: stop generating full story bodies into `BACKLOG.md`, keeping rules, status table, reviews. This is the only stage that breaks old graders' `awk` ranges, so it would need either frozen grader copies of the old file or a grader-contract change — decide then.

# Backlog → vault migration — verification ledger

Evidence for the stages in [VAULT-MIGRATION](./VAULT-MIGRATION.md), kept apart from [AUDIT](./AUDIT.md) so migration stages don't count toward the main backlog's review debt.

Written only by `scripts/audit.sh`, never by hand:

```bash
BT_AUDIT_LEDGER=docs/v3/VAULT-MIGRATION-AUDIT.md BT_AUDIT_BACKLOG=docs/v3/VAULT-MIGRATION.md \
  scripts/audit.sh story V1
```

<!-- entries below; newest last; appended by scripts/audit.sh -->

---

## 2026-09-13 — V1 completed

**Generated read-only vault**

| | |
|---|---|
| Entry | story completion |
| Captured (UTC) | `2026-09-14T05:37:41Z` |
| Shipped in | the commit that adds this entry |
| HEAD at capture | `62cc1f9` (tree dirty) |
| Grader | `scripts/verify-V1.sh` — exit `0` |
| `pnpm verify` | exit `0` |

**What was tested and verified**

```
check 1 PASS: backlog:vault --out writes one stories/S<N>.md per ### S<N> heading, same set
check 2 PASS: frontmatter fields present; priority/status match the table for every story; spot-checked optional fields
check 3 PASS: note body is the story section verbatim, with a generated banner
check 4 PASS: generator rejects table/section disagreement (colocated tests cover it)
check 5 PASS: generated files are read-only; two runs are byte-identical
check 6 PASS: Backlog.base defines a table view sorted by priority; Baseline.md holds the baseline table
check 7 PASS: .backlog-vault/ is gitignored
check 8 PASS: husky post-commit/post-merge/post-checkout run the generator and never fail git
check 9 PASS: audit.sh honors BT_AUDIT_LEDGER / BT_AUDIT_BACKLOG with unchanged defaults
check 10 PASS: scripts/backlog-vault vitest suite exits 0
check 11 PASS: BACKLOG.md and scripts/verify-S*.sh unchanged since stage start
check 12 PASS: eslint passes on scripts/backlog-vault
```

**12/12 checks passed**

<details><summary>Grader output</summary>

```

--- verify-V1 check results ---
check 1 PASS: backlog:vault --out writes one stories/S<N>.md per ### S<N> heading, same set
check 2 PASS: frontmatter fields present; priority/status match the table for every story; spot-checked optional fields
check 3 PASS: note body is the story section verbatim, with a generated banner
check 4 PASS: generator rejects table/section disagreement (colocated tests cover it)
check 5 PASS: generated files are read-only; two runs are byte-identical
check 6 PASS: Backlog.base defines a table view sorted by priority; Baseline.md holds the baseline table
check 7 PASS: .backlog-vault/ is gitignored
check 8 PASS: husky post-commit/post-merge/post-checkout run the generator and never fail git
check 9 PASS: audit.sh honors BT_AUDIT_LEDGER / BT_AUDIT_BACKLOG with unchanged defaults
check 10 PASS: scripts/backlog-vault vitest suite exits 0
check 11 PASS: BACKLOG.md and scripts/verify-S*.sh unchanged since stage start
check 12 PASS: eslint passes on scripts/backlog-vault
--- verify-V1: 12/12 checks passed ---
verify-V1: all checks passed
```

</details>

<details><summary><code>pnpm verify</code> (tail)</summary>

```
packages/mlb-api typecheck$ tsc -p tsconfig.json --noEmit
packages/domain typecheck: Done
packages/mlb-api typecheck: Done
web typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck: Done
web typecheck: Done
functions typecheck$ tsc -p tsconfig.json --noEmit
functions typecheck: Done
.                                        |  WARN  Unsupported engine: wanted: {"node":">=24"} (current: {"node":"v20.9.0","pnpm":"9.4.0"})
Scope: 5 of 6 workspace projects
packages/domain build$ tsc -p tsconfig.json --noEmit
packages/mlb-api build$ tsc -p tsconfig.json --noEmit
packages/domain build: Done
packages/mlb-api build: Done
web build$ tsc -p tsconfig.json --noEmit && vite build
packages/ports build$ tsc -p tsconfig.json --noEmit
packages/ports build: Done
web build: vite v6.4.3 building for production...
web build: transforming...
web build: ✓ 776 modules transformed.
web build: rendering chunks...
web build: computing gzip size...
web build: dist/index.html                   0.73 kB │ gzip:   0.40 kB
web build: dist/assets/index-Bzd6sD-u.css  201.57 kB │ gzip:  29.40 kB
web build: dist/assets/index-DiVFy7qN.js   414.78 kB │ gzip: 131.29 kB
web build: ✓ built in 828ms
web build: Done
functions build$ tsc -p tsconfig.json --noEmit
functions build: Done
```

</details>

---

## 2026-09-13 — V2 completed

**Byte-identical round trip**

| | |
|---|---|
| Entry | story completion |
| Captured (UTC) | `2026-09-14T05:51:54Z` |
| Shipped in | the commit that adds this entry |
| HEAD at capture | `03a05c1` (tree dirty) |
| Grader | `scripts/verify-V2.sh` — exit `0` |
| `pnpm verify` | exit `0` |

**What was tested and verified**

```
check 1 PASS: --roundtrip --to assembles BACKLOG.md byte-identically (grader's own cmp)
check 2 PASS: round trip is byte-identical for BACKLOG.md at the last 5 commits that touched it
check 3 PASS: status table and bodies come from the notes: tampered priority re-sorts the row, tampered body line appears
check 4 PASS: any BACKLOG.md change since stage start is whitespace-only
check 5 PASS: grader-matched lines (status rows, story headings, Status lines) and verify-S*.sh unchanged
check 6 PASS: vitest suite exits 0 and includes a round-trip test
check 7 PASS: eslint passes on scripts/backlog-vault
```

**7/7 checks passed**

<details><summary>Grader output</summary>

```

--- verify-V2 check results ---
check 1 PASS: --roundtrip --to assembles BACKLOG.md byte-identically (grader's own cmp)
check 2 PASS: round trip is byte-identical for BACKLOG.md at the last 5 commits that touched it
check 3 PASS: status table and bodies come from the notes: tampered priority re-sorts the row, tampered body line appears
check 4 PASS: any BACKLOG.md change since stage start is whitespace-only
check 5 PASS: grader-matched lines (status rows, story headings, Status lines) and verify-S*.sh unchanged
check 6 PASS: vitest suite exits 0 and includes a round-trip test
check 7 PASS: eslint passes on scripts/backlog-vault
--- verify-V2: 7/7 checks passed ---
verify-V2: all checks passed
```

</details>

<details><summary><code>pnpm verify</code> (tail)</summary>

```
packages/domain typecheck$ tsc -p tsconfig.json --noEmit
packages/mlb-api typecheck$ tsc -p tsconfig.json --noEmit
packages/domain typecheck: Done
packages/mlb-api typecheck: Done
web typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck: Done
web typecheck: Done
functions typecheck$ tsc -p tsconfig.json --noEmit
functions typecheck: Done
Scope: 5 of 6 workspace projects
packages/domain build$ tsc -p tsconfig.json --noEmit
packages/mlb-api build$ tsc -p tsconfig.json --noEmit
packages/domain build: Done
packages/mlb-api build: Done
web build$ tsc -p tsconfig.json --noEmit && vite build
packages/ports build$ tsc -p tsconfig.json --noEmit
packages/ports build: Done
web build: vite v6.4.3 building for production...
web build: transforming...
web build: ✓ 776 modules transformed.
web build: rendering chunks...
web build: computing gzip size...
web build: dist/index.html                   0.73 kB │ gzip:   0.40 kB
web build: dist/assets/index-Bzd6sD-u.css  201.57 kB │ gzip:  29.40 kB
web build: dist/assets/index-DiVFy7qN.js   414.78 kB │ gzip: 131.29 kB
web build: ✓ built in 758ms
web build: Done
functions build$ tsc -p tsconfig.json --noEmit
functions build: Done
```

</details>

---

## 2026-09-13 — V3 completed

**Story files become the source**

| | |
|---|---|
| Entry | story completion |
| Captured (UTC) | `2026-09-14T06:26:33Z` |
| Shipped in | the commit that adds this entry |
| HEAD at capture | `6e062e3` (tree dirty) |
| Grader | `scripts/verify-V3.sh` — exit `0` |
| `pnpm verify` | exit `0` |

**What was tested and verified**

```
check 1 PASS: one note per story ID, frame notes present, backlog:check exits 0
check 2 PASS: temp copy: status edit fails check, build updates table row + Status line, Obsidian-style frontmatter normalizes
check 3 PASS: story note bodies carry no ### heading and no **Status:** line
check 4 PASS: lint runs backlog:check, test:coverage runs test:backlog (so verify + CI do); ci.yml unchanged
check 5 PASS: verify-S*.sh exit codes unchanged; audit.sh S26 reverify works; grader-matched BACKLOG lines unchanged
check 6 PASS: rules 5/13/17, CLAUDE.md, both skills name docs/v3/backlog/ + backlog:build; no hand-sorting instruction
check 7 PASS: pre-commit builds + guards; V1 hooks/script/.backlog-vault references gone; .obsidian ignored
check 8 PASS: CHANGELOG.md mentions the Obsidian backlog
check 9 PASS: eslint and test:backlog pass
check 10 PASS: a backlog review entry landed after the V3 work commit
```

**10/10 checks passed**

<details><summary>Grader output</summary>

```

--- verify-V3 check results ---
check 1 PASS: one note per story ID, frame notes present, backlog:check exits 0
check 2 PASS: temp copy: status edit fails check, build updates table row + Status line, Obsidian-style frontmatter normalizes
check 3 PASS: story note bodies carry no ### heading and no **Status:** line
check 4 PASS: lint runs backlog:check, test:coverage runs test:backlog (so verify + CI do); ci.yml unchanged
check 5 PASS: verify-S*.sh exit codes unchanged; audit.sh S26 reverify works; grader-matched BACKLOG lines unchanged
check 6 PASS: rules 5/13/17, CLAUDE.md, both skills name docs/v3/backlog/ + backlog:build; no hand-sorting instruction
check 7 PASS: pre-commit builds + guards; V1 hooks/script/.backlog-vault references gone; .obsidian ignored
check 8 PASS: CHANGELOG.md mentions the Obsidian backlog
check 9 PASS: eslint and test:backlog pass
check 10 PASS: a backlog review entry landed after the V3 work commit
--- verify-V3: 10/10 checks passed ---
verify-V3: all checks passed
```

</details>

<details><summary><code>pnpm verify</code> (tail)</summary>

```
packages/domain typecheck$ tsc -p tsconfig.json --noEmit
packages/mlb-api typecheck$ tsc -p tsconfig.json --noEmit
packages/domain typecheck: Done
packages/mlb-api typecheck: Done
web typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck$ tsc -p tsconfig.json --noEmit
packages/ports typecheck: Done
web typecheck: Done
functions typecheck$ tsc -p tsconfig.json --noEmit
functions typecheck: Done
Scope: 5 of 6 workspace projects
packages/domain build$ tsc -p tsconfig.json --noEmit
packages/mlb-api build$ tsc -p tsconfig.json --noEmit
packages/domain build: Done
packages/mlb-api build: Done
web build$ tsc -p tsconfig.json --noEmit && vite build
packages/ports build$ tsc -p tsconfig.json --noEmit
packages/ports build: Done
web build: vite v6.4.3 building for production...
web build: transforming...
web build: ✓ 776 modules transformed.
web build: rendering chunks...
web build: computing gzip size...
web build: dist/index.html                   0.73 kB │ gzip:   0.40 kB
web build: dist/assets/index-Bzd6sD-u.css  201.57 kB │ gzip:  29.40 kB
web build: dist/assets/index-DiVFy7qN.js   414.78 kB │ gzip: 131.29 kB
web build: ✓ built in 791ms
web build: Done
functions build$ tsc -p tsconfig.json --noEmit
functions build: Done
```

</details>

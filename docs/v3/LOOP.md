# Loop-ready automation guide

How to run Baseball Theater v3 with goal/loop agents without relying on chat memory.

## Checklist status

| Step | Status | Evidence |
|------|--------|----------|
| 1. Clean baseline + tag | **Done** | `git status` clean at tag `loop-baseline` (pre-scaffold) / post-scaffold commit |
| 2. Single exit-code verify | **Done** | `pnpm verify` · recipe `.claude/skills/verify/SKILL.md` |
| 3. Conventions recovered | **Done** | `CLAUDE.md` (edit if wrong) |
| 4. Checkable backlog | **Done** | `docs/v3/BACKLOG.md` |
| 5. Permission boundaries | **Done** | `.claude/settings.json` + `.cursor/rules/agent-boundaries.mdc` |
| 6. Pilot one story | **Ready** | S1 prompt in BACKLOG — **you** run/watch first `/goal` |
| 7. Fresh-context reviewer | **Ready** | Process below (`/code-review` or Bugbot/security review) |
| 8. Scale then unattended loop | **Not yet** | Only after S1–S2 succeed observed |

## 1 — Baseline

```bash
git status          # clean
git tag -l loop-baseline
```

Rollback if a loop trashes the tree:

```bash
git switch -C recovery loop-baseline
```

## 2 — Verify

```bash
pnpm verify
```

Non-zero ⇒ not done. Details: `.claude/skills/verify/SKILL.md`.

## 3 — Conventions

Read and correct `CLAUDE.md` once. Anything you disagree with must be written there; chat-only preferences die at compaction.

## 4 — Backlog

Work only from `docs/v3/BACKLOG.md`. If a criterion is ambiguous mid-run, **tighten the backlog**, then re-run — don’t just patch code.

## 5 — Boundaries

Claude Code: `.claude/settings.json` (`permissions.deny` / `ask`).

Cursor: `.cursor/rules/agent-boundaries.mdc` (always apply).

Also enable **worktree isolation** for unattended runs so agents don’t mutate your dirty working tree.

## 6 — Pilot (do this next, watched)

Use the S1 prompt in BACKLOG. Watch stalls/overreach. Do not walk away on the first run.

## 7 — Reviewer pass

Before accepting loop output onto `main`:

1. Ensure `pnpm verify` is green on the branch
2. Run a **fresh-context** review (no prior loop transcript):
   - Claude Code: `/code-review`
   - Cursor: Bugbot review and/or Security Review on the diff
3. Fix anything the reviewer flags that violates BACKLOG AC or CLAUDE.md
4. Only then merge/push

## 8 — Scale → loop

| Stage | When | How |
|-------|------|-----|
| Multi-story `/goal` | After S1 clean under watch | Cap turns; still require `pnpm verify` |
| `/loop` while you’re around | After 2–3 stories boringly succeed | Pick next `todo` from BACKLOG |
| Scheduled / cloud unattended | After verify + backlog prove solid | Only with worktrees + deny rules |

Do **not** jump to unattended loops while criteria still need human eyes.

## Habit

Every failure mode the loop missed → new test or verify step + BACKLOG/skill update.

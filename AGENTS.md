# Agent instructions

Primary conventions live in [CLAUDE.md](./CLAUDE.md).

- Verify: `pnpm verify` (see `.claude/skills/verify/SKILL.md`)
- Stories: `docs/v3/BACKLOG.md` — flip Status to `doing` / `done` with the implementation; commit before starting the next story
- Backlog review: due every **6** `done` stories or on the **second** drift event since the last review — see `.claude/skills/backlog-review/SKILL.md` and the **Backlog reviews** table in `docs/v3/BACKLOG.md`. Fresh context required; `blocked` means stop and ask
- Loop process: `docs/v3/LOOP.md`
- Boundaries: `.cursor/rules/agent-boundaries.mdc` and `.claude/settings.json`

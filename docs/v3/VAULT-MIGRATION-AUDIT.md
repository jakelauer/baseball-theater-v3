# Backlog → vault migration — verification ledger

Evidence for the stages in [VAULT-MIGRATION](./VAULT-MIGRATION.md), kept apart from [AUDIT](./AUDIT.md) so migration stages don't count toward the main backlog's review debt.

Written only by `scripts/audit.sh`, never by hand:

```bash
BT_AUDIT_LEDGER=docs/v3/VAULT-MIGRATION-AUDIT.md BT_AUDIT_BACKLOG=docs/v3/VAULT-MIGRATION.md \
  scripts/audit.sh story V1
```

<!-- entries below; newest last; appended by scripts/audit.sh -->

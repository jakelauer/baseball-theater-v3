#!/usr/bin/env bash
# Print a story's full `/goal` command and copy it to the clipboard.
#
#   pnpm goal 37              # or S37 / s37
#
# The `/goal S<N> done` shorthand stores only "S<N> done" as the goal; pasting the
# full line makes the story's exact completion condition the goal itself.
# Reads the generated docs/v3/BACKLOG.md, so run `pnpm backlog:build` after editing notes.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
backlog="$root/docs/v3/BACKLOG.md"

arg="${1:-}"
id="${arg#[sS]}"
if [[ ! "$id" =~ ^[0-9]+$ ]]
then
	echo "usage: pnpm goal <N>   (e.g. pnpm goal 37)" >&2
	exit 2
fi

line="$(grep -m1 "^/goal docs/v3/BACKLOG.md S$id\. " "$backlog" || true)"
if [[ -z "$line" ]]
then
	echo "no /goal command for S$id in docs/v3/BACKLOG.md" >&2
	exit 1
fi

echo "$line"
if command -v pbcopy > /dev/null
then
	printf '%s' "$line" | pbcopy
	echo "(copied to clipboard)" >&2
fi

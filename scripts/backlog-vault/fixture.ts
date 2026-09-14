/** A small backlog exercising every note feature, and a ledger for its review-debt line (shared by the tests). */

import { parseBacklog } from "./parse.ts";
import { renderNotes } from "./vault.ts";

export const FIXTURE = [
	"<!-- Generated from docs/v3/backlog/ -->",
	"# Checkable backlog",
	"",
	"### Story status",
	"",
	"| Priority | ID | Story | Status |",
	"|----------|----|-------|--------|",
	"| 1 | [S9](#s9--align-pnpm-dev-with-emulator-story-document--smoke) | Align `pnpm dev` | `todo` |",
	"| 2 | [S1](#s1--domain-window-helpers-fully-tested-pilot) | Domain window helpers *(pilot)* | `done` |",
	"",
	"**Next (generated):** **1 / S9** — the lowest **Priority** with Status `todo`.",
	"",
	"**Review debt (generated from [AUDIT](./AUDIT.md)):** 1 of 3 stories `done` since the last backlog review (2026-09-10, verdict `amended`): S1. A drift event makes a review due regardless of this count.",
	"",
	"---",
	"",
	"## Current baseline",
	"",
	"| Area | State |",
	"",
	"---",
	"",
	"## Stories",
	"",
	"### S1 — Domain window helpers fully tested *(pilot)*",
	"",
	"**Goal condition:** stop after 8 turns.",
	"",
	"**Status:** `done`",
	"   ",
	"",
	"---",
	"",
	"## Data platform — MLB access & types",
	"",
	"Group intro.",
	"",
	"### S9 — Align `pnpm dev` with emulator story (document + smoke)",
	"",
	"**Depends on:** S1",
	"",
	"**Prefer after:** **S1**",
	"",
	"**Scope files:** `package.json`, `docs/v3/BACKLOG.md`",
	"",
	"**Turn cap:** 10 — assumes things.",
	"",
	"**Status:** `todo`",
	"",
	"### Later themes (not yet story-sliced)",
	"",
	"---",
	"",
	"## Gap map (doc → story)",
	"",
].join("\n");

export const AUDIT = [
	"# Ledger",
	"## 2026-09-08 — S9 completed",
	"## 2026-09-10 — backlog review (`amended`)",
	"## 2026-09-11 — S1 re-verified",
	"## 2026-09-12 — S1 completed",
	"",
].join("\n");

export function notesFor(markdown: string): Map<string, string>
{
	return renderNotes(parseBacklog(markdown));
}

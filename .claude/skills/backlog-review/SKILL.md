---
name: backlog-review
description: Re-evaluate docs/v3/BACKLOG.md against the current state of the repo and decide whether work may continue. Use when review debt is due (3 stories done since the last review, or any drift event), before starting the next story, or when a loop asks whether the plan is still right.
---

# Backlog review

`pnpm verify` proves the **code** is healthy. Nothing proves the **plan** is still healthy. Stories are written against a repo that no longer exists by the time they run: dependencies land, ADRs get accepted, a fence gets widened, a whole concern turns out to be missing. This review is the gate for that drift.

## When it is due

Due when **either** condition holds — whichever comes first:

| Trigger                                | Threshold                                                    |
| -------------------------------------- | ------------------------------------------------------------ |
| **Story count** (backstop)             | **3** stories flipped to `done` since the last logged review |
| **Drift event** (any one, immediately) | see below                                                    |

**Drift events** — any of these means the backlog has already diverged from reality, so review before the next story rather than waiting for the count:

1. A **scope fence was widened** mid-run, or rule 10 stop-and-report fired.
2. A **turn cap** was hit or exceeded.
3. A story's **acceptance criteria had to be rewritten** to be runnable (BACKLOG rule: tighten the backlog, not just the code).
4. A **new ADR** was accepted in `docs/v3/ARCHITECTURE.md`, or an existing one materially changed.
5. A **new workspace package** appeared.
6. A story was **inserted or re-prioritized** outside a review.
7. **`pnpm verify` itself changed** — the gate moved.

Count triggers are cheap to satisfy and easy to ignore; the event list is the part that actually catches drift. Prefer over-reviewing to discovering a missing concern four stories later.

## Fresh context is required

Run this **without** the transcript that produced the stories being reviewed — a separate agent, a subagent, or a new session. An agent reviewing its own recent plan will confirm it. This mirrors the fresh-context reviewer pass in `docs/v3/LOOP.md` §7.

## The four checks

Run all four. Each produces findings or cited evidence — never a bare "looks fine."

### 1. Coverage — is anything missing?

Scope: the **next 3** stories by Priority with Status `todo`, plus the concerns they touch.

- Does the carried product loop have a gap that no story owns? Compare `docs/v3/FEATURES.md`, `VISUAL-DESIGN.md`, and the accepted ADRs against the Gap map at the bottom of `BACKLOG.md`.
- Did a recently accepted ADR create work that no story carries?
- Is a story about to be built on something that does not exist and is not a listed dependency?
- Is there a **Later theme** that recent work has promoted into a real blocker?

### 2. Ground truth — do the next stories still hold at HEAD?

For **each** of the next 3 stories:

- Every path named in its **Scope files** and acceptance criteria: does it exist at HEAD, or is its absence exactly what the story creates (red-first per rule 9)?
- Every command in its ACs: is it still the right command? (Package names, script names, and filters drift.)
- Every story in its **Depends on** / **Prefer after**: is it `done`?
- Its **turn cap**: is the stated assumption still true given what has landed since?
- Its **Goal condition** fence: can the ACs actually be met inside it? (This is what rule 10 exists to catch — catching it here is cheaper than mid-run.)

### 3. Prioritization challenge — the whole backlog, not just the next few

Argue **against** the current order, using what has changed since the last logged review:

- Does anything now block something above it?
- Did a dependency landing make a lower story cheap, or a higher story pointless?
- Is a story still the smallest thing that moves the carried loop (rule 4)?
- Has anything become obsolete, or been quietly done by another story?
- Do the `done` stories suggest a class of work being systematically underestimated?

Re-sort the **Story status** table by Priority if the order changes.

Check the **Current baseline** table in `BACKLOG.md` against HEAD (rule 17): every **Done** row names something that exists, every `done` story since the **As of** line is reflected, and any amendment this review makes (insert, remove, re-scope) is reflected too. Fix drifted rows as part of the amendment.

### 4. Verdict — the call

| Verdict    | Meaning                                                  | Then                                           |
| ---------- | -------------------------------------------------------- | ---------------------------------------------- |
| `continue` | Next stories are sound as written                        | Log it, proceed                                |
| `amended`  | Backlog changed — tightened, inserted, or re-prioritized | Log it, **commit the amendment**, then proceed |
| `blocked`  | Needs a human decision (product call, scope conflict)    | Log it, **stop and ask**. Do not start a story |

## Evidence requirement (anti-rubber-stamp)

A `continue` verdict is only valid if the log entry records, for each of the next 3 stories, that check 2 was actually performed — the paths and commands looked at, and the dependency statuses. A review with no findings and no cited evidence is not a review; treat it as not having happened.

Findings that are real but out of scope to fix now become **backlog amendments**, not chat commentary. Chat-only conclusions die at compaction.

## Log it

Append an entry to the verification ledger, `docs/v3/AUDIT.md`, and commit it with any amendment:

```bash
scripts/audit.sh review \
  --trigger "3 stories done since last review" \
  --since "S23, S21, S13" \
  --verdict amended \
  --findings -   # reads the findings body from stdin
```

The script records date, HEAD short SHA, tree state, trigger, stories `done` since, and the verdict; you supply the findings. It refuses a verdict with no findings, and exits nonzero on `blocked`.

That ledger defines "since the last review" — it holds the story completion entries too, so the counter reads off one file. Without the entry the next review has no baseline and the story counter cannot be trusted.

Then update the **Backlog reviews** scheduling notes in `docs/v3/BACKLOG.md`: what is now due next, and any drift the following review must weigh.

## What this does not cover

- Code correctness — that is `pnpm verify` plus the fresh-context code review in `LOOP.md` §7.
- Whether a story's ACs are _achievable_ in practice; only whether they are still coherent, dependency-satisfied, and inside their fence.
- Product decisions. Surface them as `blocked`; do not decide them.

## Recipe maintenance

If a drift class slips through — a review said `continue` and the next story still went sideways — add the signal to the drift-event list above and to check 2, then note it in the review log entry that caught it.

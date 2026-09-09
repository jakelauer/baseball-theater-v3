/**
 * Recorded leaf paths that are deliberately not modeled.
 *
 * Every entry needs a `// reason:` comment, and the list is capped (S23 holds
 * it at 25) so "explain everything" cannot decay into "ignore everything". A
 * path belongs here only when MLB has never sent enough of it to model — not
 * because modeling it is tedious.
 */
export const COVERAGE_IGNORE: readonly string[] = [];

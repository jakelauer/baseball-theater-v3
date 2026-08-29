import type { MediaHighlight } from "./types.js";

export type RankablePlayContext = {
  playId: string | null;
  /** Approximate leverage / impact 0–1 from heuristics. */
  impactScore: number;
  keywords: string[];
};

const HIGH_IMPACT = [
  "walk-off",
  "walk off",
  "grand slam",
  "home run",
  "homers",
  "go-ahead",
  "ties it",
  "steal home",
];

/**
 * Phase A heuristic: score highlights by title/blurb keywords + optional play context.
 * Higher = show first. Stable sort by id as tiebreaker.
 */
export function rankHighlightsByImpact(
  highlights: MediaHighlight[],
  playContext: RankablePlayContext[] = [],
): MediaHighlight[] {
  const byPlay = new Map(
    playContext.filter((p) => p.playId).map((p) => [p.playId as string, p]),
  );

  const scored = highlights.map((h) => {
    const text = `${h.title} ${h.blurb ?? ""}`.toLowerCase();
    let score = 0;
    for (const kw of HIGH_IMPACT) {
      if (text.includes(kw)) score += 10;
    }
    if (h.playId && byPlay.has(h.playId)) {
      score += byPlay.get(h.playId)!.impactScore * 20;
    }
    return { h, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.h.id.localeCompare(b.h.id);
  });

  return scored.map((s) => s.h);
}

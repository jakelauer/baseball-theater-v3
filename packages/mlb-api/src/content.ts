/**
 * `GET /api/v1/game/{gamePk}/content` — highlights and editorial.
 */

export interface GameContentResponse {
  copyright?: string;
  link?: string;
  editorial?: ContentEditorial;
  highlights?: ContentHighlightsWrapper;
  media?: ContentMedia;
  summary?: ContentSummary;
  gameNotes?: unknown;
}

/**
 * MLB nests twice here: `highlights.highlights.items`. The outer keys are
 * placements (game center, scoreboard, live), the inner one is the reel.
 * Unused placements come back as `null`, not absent.
 */
export interface ContentHighlightsWrapper {
  highlights?: ContentHighlightList | null;
  gameCenter?: ContentHighlightList | null;
  scoreboard?: ContentHighlightList | null;
  scoreboardPreview?: ContentHighlightList | null;
  live?: ContentHighlightList | null;
  milestone?: ContentHighlightList | null;
}

export interface ContentHighlightList {
  title?: string;
  items: ContentHighlightItem[];
}

/** One highlight video. */
export interface ContentHighlightItem {
  id?: string;
  type?: string;
  state?: string;
  date?: string;
  title: string;
  headline?: string;
  seoTitle?: string;
  slug?: string;
  blurb: string;
  description?: string;
  duration?: string;
  kicker?: string;
  mediaPlaybackId?: string;
  mediaPlaybackUrl?: string;
  playbacks: PlaybackUrl[];
  image?: ContentImage;
  keywordsAll?: ContentKeyword[];
  keywordsDisplay?: ContentKeyword[];
  noIndex?: boolean;
}

/** One encoding of a highlight. `name` is the format (`hlsCloud`, `mp4Avc`, …). */
export interface PlaybackUrl {
  name: string;
  url: string;
  width?: string;
  height?: string;
}

export interface ContentImage {
  title?: string;
  altText?: string | null;
  templateUrl?: string;
  cuts?: ContentImageCut[];
}

export interface ContentImageCut {
  aspectRatio?: string;
  width?: number;
  height?: number;
  src?: string;
  at2x?: string;
  at3x?: string;
}

export interface ContentKeyword {
  type?: string;
  value?: string;
  displayName?: string;
}

export interface ContentEditorial {
  preview?: ContentEditorialSlot | null;
  recap?: ContentEditorialSlot | null;
  wrap?: ContentEditorialSlot | null;
  articles?: unknown;
}

/** Keyed by outlet — `mlb` is the one BT reads. */
export interface ContentEditorialSlot {
  mlb?: ContentArticle;
}

export interface ContentArticle {
  type?: string;
  state?: string;
  date?: string;
  headline?: string;
  seoTitle?: string;
  slug?: string;
  blurb?: string;
  body?: string;
  url?: string;
  image?: ContentImage;
  contributors?: ContentContributor[];
  media?: ContentHighlightItem;
}

export interface ContentContributor {
  name?: string;
  twitter?: string;
}

export interface ContentMedia {
  epg?: unknown;
  epgAlternate?: unknown;
  featured?: unknown;
  freeGame?: boolean;
  enhancedGame?: boolean;
}

export interface ContentSummary {
  hasPreviewArticle?: boolean;
  hasRecapArticle?: boolean;
  hasWrapArticle?: boolean;
  hasHighlightsVideo?: boolean;
}

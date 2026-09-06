/**
 * Pure upstream → BT mapper for game content.
 *
 * Highlights come from the content endpoint (`/api/v1/game/{gamePk}/content`),
 * which is the only payload carrying playback URLs; the live feed hydrate does
 * not include them.
 */
import type { MediaHighlight } from "@bt/domain";
import type { ContentHighlightItem, GameContentResponse } from "@bt/mlb-api";

/** Prefers the highest-fidelity MP4, falling back to the HLS cloud stream. */
export function pickPlaybackUrl(item: ContentHighlightItem): string | null {
  const mp4 = item.playbacks.find((playback) => playback.name.startsWith("mp4Avc"));
  const hls = item.playbacks.find((playback) => playback.name === "hlsCloud");
  return mp4?.url ?? hls?.url ?? item.playbacks[0]?.url ?? item.mediaPlaybackUrl ?? null;
}

function pickImageUrl(item: ContentHighlightItem): string | null {
  const cut = item.image?.cuts?.find((entry) => entry.src);
  return cut?.src ?? item.image?.templateUrl ?? null;
}

export function mapHighlightItem(item: ContentHighlightItem): MediaHighlight {
  return {
    id: item.id ?? item.slug ?? item.title,
    playId: item.mediaPlaybackId ?? null,
    title: item.title,
    blurb: item.blurb || item.description || null,
    duration: item.duration ?? null,
    imageUrl: pickImageUrl(item),
    playbackUrl: pickPlaybackUrl(item),
  };
}

export function mapContentHighlights(content: GameContentResponse): MediaHighlight[] {
  const items = content.highlights?.highlights?.items ?? [];
  return items.map(mapHighlightItem);
}

/** The editorial recap blurb BT shows on the Recap tab. */
export function mapRecapBlurb(content: GameContentResponse): string | null {
  return content.editorial?.recap?.mlb?.blurb ?? null;
}

/**
 * `GET /api/v1/game/{gamePk}/content` — highlights and editorial.
 */

/**
 * The content block itself. The schedule hydrate returns exactly this shape,
 * so `ScheduleGameContent` aliases it rather than declaring a near-copy.
 */
export interface GameContentBody {
	link?: string;
	editorial?: ContentEditorial;
	highlights?: ContentHighlightsWrapper;
	media?: ContentMedia;
	summary?: ContentSummary;
	/** Always `{}` in the recorded payloads; shape unknown. */
	gameNotes?: unknown;
}

export interface GameContentResponse extends GameContentBody {
	copyright?: string;
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
	guid?: string;
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
	/** WebVTT track of on-screen locations, when MLB has cut one. */
	cclocationVtt?: string;
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
	/** Always `null` in the recorded payloads; shape unknown. */
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
	seoKeywords?: string;
	slug?: string;
	blurb?: string;
	body?: string;
	url?: string;
	image?: ContentImage;
	photo?: ContentImage;
	contributors?: ContentContributor[];
	keywordsAll?: ContentKeyword[];
	keywordsDisplay?: ContentKeyword[];
	media?: ContentHighlightItem;
}

export interface ContentContributor {
	name?: string;
	twitter?: string;
}

export interface ContentMedia {
	epg?: unknown;
	epgAlternate?: ContentEpgGroup[];
	featuredMedia?: ContentFeaturedMedia;
	previewStory?: ContentPreviewStory;
	/** Always `null` in the recorded payloads; shape unknown. */
	milestones?: unknown;
	freeGame?: boolean;
	enhancedGame?: boolean;
}

/** An EPG group is a titled reel — the same shape a highlight placement has. */
export type ContentEpgGroup = ContentHighlightList;

export interface ContentFeaturedMedia {
	id?: string;
}

/** Pointers to the preview article, by outlet and as a flat list. */
export interface ContentPreviewStory {
	mlb?: ContentStoryRef;
	items?: ContentStoryRef[];
}

export interface ContentStoryRef {
	dapiURL?: string;
	state?: string;
	keywordsAll?: ContentKeyword[];
	keywordsDisplay?: ContentKeyword[];
}

export interface ContentSummary {
	hasPreviewArticle?: boolean;
	hasRecapArticle?: boolean;
	hasWrapArticle?: boolean;
	hasHighlightsVideo?: boolean;
}

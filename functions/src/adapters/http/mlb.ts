/**
 * Live MLB Stats API adapter.
 *
 * Opt-in only: `local-server.ts` keeps `FixtureMlbStatsClient` as the default
 * and constructs this one when `BT_USE_LIVE_MLB=1`. Fixtures stay the CI path
 * so `pnpm verify` never needs network.
 *
 * Highlights come from the content endpoint (`/api/v1/game/{gamePk}/content`);
 * the live feed hydrate carries no playback URLs.
 */
import type { GameSnapshot, ScheduleDay } from "@bt/domain";
import { rankHighlightsByImpact } from "@bt/domain";
import {
  parseGameContentResponse,
  parseLiveFeedResponse,
  parseScheduleResponse,
} from "@bt/mlb-api";
import type { MlbStatsClient } from "@bt/ports";
import { mapContentHighlights } from "../../mappers/content.js";
import { mapLiveFeed } from "../../mappers/live.js";
import { mapScheduleResponse } from "../../mappers/schedule.js";

const DEFAULT_BASE_URL = "https://statsapi.mlb.com";

const SCHEDULE_HYDRATE =
  "team,linescore(matchup,runners),flags,liveLookin,review,decisions,person,probablePitcher,stats,game(content(media(featured,epg),summary))";

export interface HttpMlbStatsClientOptions {
  baseUrl?: string;
  /** Injected in tests; defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export class HttpMlbStatsClient implements MlbStatsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: HttpMlbStatsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? (() => new Date());
  }

  async fetchSchedule(date: string): Promise<ScheduleDay> {
    const url = `${this.baseUrl}/api/v1/schedule?sportId=1&date=${date}&hydrate=${SCHEDULE_HYDRATE}`;
    const payload = parseScheduleResponse(await this.getJson(url));
    return mapScheduleResponse(payload, date, this.now().toISOString(), "active");
  }

  async fetchGame(gamePk: number): Promise<GameSnapshot> {
    const feedUrl = `${this.baseUrl}/api/v1.1/game/${gamePk}/feed/live`;
    const feed = parseLiveFeedResponse(await this.getJson(feedUrl));
    const snapshot = mapLiveFeed(feed, this.now().toISOString(), "active");
    return { ...snapshot, highlights: await this.fetchHighlights(gamePk) };
  }

  /** Content is best-effort: a game with no cut highlights still resolves. */
  private async fetchHighlights(gamePk: number): Promise<GameSnapshot["highlights"]> {
    const url = `${this.baseUrl}/api/v1/game/${gamePk}/content?language=en`;
    try {
      const content = parseGameContentResponse(await this.getJson(url));
      return rankHighlightsByImpact(mapContentHighlights(content));
    } catch {
      return [];
    }
  }

  private async getJson(url: string): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`MLB Stats API ${response.status} for ${url}`);
    }
    return await response.json();
  }
}

/**
 * The mid-game fixture the Live theater is built against (S63): CHC @ MIA (823823)
 * folded from its recorded pre-game feed through MLB's own diff log
 * (`fixtures/raw/live-823823-base.json` + `diffpatch-823823.json`) to one named
 * moment — top of the 3rd, two out, bases loaded, Alex Bregman 2–2 against Ryan Gusto,
 * five pitches into the at-bat. Offline: the same `reconstructReplay` the replay
 * service uses, then the same `mapLiveFeed` live data goes through.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
	parseLiveFeedResponse, parseRecordedReplayWalk, reconstructReplay,
} from "@bt/mlb-api";
import type { GameSnapshot, Unversioned } from "@bt/domain";
import { mapLiveFeed } from "../mappers/live.js";

/** The recorded moment `fixtures/game-823823-live.json` shows. */
export const LIVE_FIXTURE_TIMECODE = "20260905_205719";

/** A game as a fixture file holds it: no fetch time or window, plays inline. */
export type LiveFixture = Omit<Unversioned<GameSnapshot>, "fetchedAt" | "windowMode">;

/**
 * Fold `<rawDir>/live-823823-base.json` through `<rawDir>/diffpatch-823823.json` up to
 * `timecode` and map the feed at that moment. Throws if the walk never reaches it.
 */
export function liveFixtureAt(rawDir: string, timecode = LIVE_FIXTURE_TIMECODE): LiveFixture
{
	const read = (name: string): unknown => JSON.parse(readFileSync(path.join(rawDir, name), "utf8"));
	const { states } = reconstructReplay(read("live-823823-base.json"), parseRecordedReplayWalk(read("diffpatch-823823.json")));
	const state = states.find((s) => s.timecode === timecode);
	if (!state) throw new Error(`the recorded walk has no state at ${timecode}`);
	const {
		fetchedAt: _fetchedAt, windowMode: _windowMode, ...game
	} = mapLiveFeed(parseLiveFeedResponse(state.feed), "");
	return game;
}

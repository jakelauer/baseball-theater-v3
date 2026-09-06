/**
 * Pure upstream → BT mappers for the live feed (play-by-play + Statcast).
 *
 * Highlights are sourced from the content endpoint (`/game/{pk}/content`), not
 * the live feed hydrate — the live feed carries no playback URLs. See
 * `./content.ts`.
 */
import type { AtBat, GameSnapshot, PitchEvent } from "@bt/domain";
import type {
  LiveFeedResponse,
  LiveGamePlay,
  LiveGamePlayEvent,
  PitchData as UpstreamPitchData,
} from "@bt/mlb-api";
import { mapLinescore, mapStatus, mapTeam } from "./schedule.js";

function mapPitchData(pitch: UpstreamPitchData | undefined): PitchEvent["pitchData"] {
  const coords = pitch?.coordinates;
  if (!pitch || !coords || coords.pX === undefined || coords.pZ === undefined) {
    return null;
  }
  return {
    startSpeed: pitch.startSpeed ?? 0,
    endSpeed: pitch.endSpeed ?? 0,
    strikeZoneTop: pitch.strikeZoneTop ?? 0,
    strikeZoneBottom: pitch.strikeZoneBottom ?? 0,
    zone: pitch.zone ?? null,
    plateTime: pitch.plateTime ?? null,
    extension: pitch.extension ?? null,
    coordinates: {
      pX: coords.pX,
      pZ: coords.pZ,
      x0: coords.x0 ?? 0,
      y0: coords.y0 ?? 0,
      z0: coords.z0 ?? 0,
      vx0: coords.vX0 ?? 0,
      vy0: coords.vY0 ?? 0,
      vz0: coords.vZ0 ?? 0,
      ax: coords.aX ?? 0,
      ay: coords.aY ?? 0,
      az: coords.aZ ?? 0,
      pfxX: coords.pfxX ?? 0,
      pfxZ: coords.pfxZ ?? 0,
    },
    breaks: pitch.breaks
      ? {
          breakAngle: pitch.breaks.breakAngle ?? 0,
          breakLength: pitch.breaks.breakLength ?? 0,
          spinRate: pitch.breaks.spinRate ?? 0,
        }
      : null,
  };
}

export function mapPitchEvent(event: LiveGamePlayEvent): PitchEvent {
  return {
    pitchNumber: event.pitchNumber ?? event.index,
    playId: event.playId ?? "",
    startTime: event.startTime ?? "",
    details: {
      call: event.details?.call?.code ?? null,
      callDescription: event.details?.call?.description ?? null,
      type: event.details?.type?.code ?? null,
      typeDescription: event.details?.type?.description ?? null,
      isBall: event.details?.isBall ?? false,
      isStrike: event.details?.isStrike ?? false,
      isInPlay: event.details?.isInPlay ?? false,
      ballColor: event.details?.ballColor ?? null,
    },
    count: {
      balls: event.count?.balls ?? 0,
      strikes: event.count?.strikes ?? 0,
      outs: event.count?.outs ?? 0,
    },
    pitchData: mapPitchData(event.pitchData),
    hitData: event.hitData
      ? {
          launchSpeed: event.hitData.launchSpeed ?? 0,
          launchAngle: event.hitData.launchAngle ?? 0,
          totalDistance: event.hitData.totalDistance ?? 0,
          trajectory: event.hitData.trajectory ?? "",
          coordinates: {
            coordX: event.hitData.coordinates?.coordX ?? 0,
            coordY: event.hitData.coordinates?.coordY ?? 0,
          },
        }
      : null,
  };
}

export function mapAtBat(play: LiveGamePlay): AtBat {
  return {
    about: {
      atBatIndex: play.about.atBatIndex,
      halfInning: play.about.isTopInning ? "top" : "bottom",
      inning: play.about.inning,
      isComplete: play.about.isComplete ?? false,
      isScoringPlay: play.about.isScoringPlay ?? false,
    },
    result: {
      event: play.result.event ?? "",
      description: play.result.description ?? "",
      eventType: play.result.eventType ?? "",
      isOut: play.result.isOut ?? false,
      rbi: play.result.rbi ?? 0,
    },
    matchup: {
      batter: {
        id: play.matchup?.batter?.id ?? 0,
        fullName: play.matchup?.batter?.fullName ?? "",
      },
      pitcher: {
        id: play.matchup?.pitcher?.id ?? 0,
        fullName: play.matchup?.pitcher?.fullName ?? "",
      },
      batSide: play.matchup?.batSide?.code ?? null,
      pitchHand: play.matchup?.pitchHand?.code ?? null,
    },
    count: {
      balls: play.count?.balls ?? 0,
      strikes: play.count?.strikes ?? 0,
      outs: play.count?.outs ?? 0,
    },
    pitches: play.playEvents.filter((event) => event.isPitch).map(mapPitchEvent),
  };
}

/**
 * Maps the live feed onto a `GameSnapshot`. Highlights come from the content
 * endpoint, so callers merge those in separately (see `mapContentHighlights`).
 */
export function mapLiveFeed(
  feed: LiveFeedResponse,
  fetchedAt: string,
  windowMode: GameSnapshot["windowMode"] = "cache",
): GameSnapshot {
  const { gameData, liveData } = feed;
  const officialDate =
    gameData.datetime?.officialDate ?? gameData.datetime?.originalDate ?? "";
  return {
    gamePk: feed.gamePk,
    gameDate: officialDate,
    officialDate,
    status: mapStatus(gameData.status),
    teams: {
      home: mapTeam(gameData.teams.home),
      away: mapTeam(gameData.teams.away),
    },
    venue: { id: gameData.venue.id, name: gameData.venue.name },
    linescore: mapLinescore(liveData.linescore),
    highlights: [],
    plays: liveData.plays.allPlays.map(mapAtBat),
    fetchedAt,
    windowMode,
  };
}

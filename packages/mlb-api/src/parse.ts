/**
 * Runtime validation for the upstream payloads.
 *
 * The schemas cover the fields BT actually binds to and let MLB's many extra
 * keys through unvalidated — a required field going missing must throw, but a
 * new upstream field must not break the parse (S15 is what notices those).
 */
import { z } from "zod";
import type { GameContentResponse } from "./content.js";
import type { LiveFeedResponse } from "./live.js";
import type { ScheduleResponse } from "./schedule.js";

const mlbRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  link: z.string().optional(),
});

const teamSchema = mlbRefSchema.extend({
  abbreviation: z.string().optional(),
  teamName: z.string().optional(),
  clubName: z.string().optional(),
  shortName: z.string().optional(),
  locationName: z.string().optional(),
});

const statusSchema = z.object({
  abstractGameState: z.string(),
  detailedState: z.string(),
  codedGameState: z.string().optional(),
  statusCode: z.string().optional(),
  abstractGameCode: z.string().optional(),
  startTimeTBD: z.boolean().optional(),
});

const venueSchema = mlbRefSchema;

const linescoreInningSchema = z.object({
  num: z.number(),
  ordinalNum: z.string(),
});

const linescoreSchema = z.object({
  innings: z.array(linescoreInningSchema),
  currentInning: z.number().optional(),
  inningState: z.string().optional(),
  isTopInning: z.boolean().optional(),
  balls: z.number().optional(),
  strikes: z.number().optional(),
  outs: z.number().optional(),
});

const scheduleGameTeamSchema = z.object({
  team: teamSchema,
  score: z.number().optional(),
  isWinner: z.boolean().optional(),
});

const scheduleGameSchema = z.object({
  gamePk: z.number(),
  gameDate: z.string(),
  officialDate: z.string().optional(),
  status: statusSchema,
  teams: z.object({
    away: scheduleGameTeamSchema,
    home: scheduleGameTeamSchema,
  }),
  venue: venueSchema.optional(),
  linescore: linescoreSchema.optional(),
});

const scheduleResponseSchema = z.object({
  copyright: z.string().optional(),
  totalGames: z.number().optional(),
  dates: z.array(
    z.object({
      date: z.string(),
      games: z.array(scheduleGameSchema),
    }),
  ),
});

const pitchCoordinatesSchema = z.object({
  pX: z.number().optional(),
  pZ: z.number().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const playEventSchema = z.object({
  index: z.number(),
  isPitch: z.boolean(),
  type: z.string().optional(),
  playId: z.string().optional(),
  pitchNumber: z.number().optional(),
  pitchData: z
    .object({
      startSpeed: z.number().optional(),
      endSpeed: z.number().optional(),
      strikeZoneTop: z.number().optional(),
      strikeZoneBottom: z.number().optional(),
      zone: z.number().optional(),
      coordinates: pitchCoordinatesSchema.optional(),
    })
    .optional(),
});

const playSchema = z.object({
  result: z.object({
    type: z.string().optional(),
    event: z.string().optional(),
    eventType: z.string().optional(),
    description: z.string().optional(),
    rbi: z.number().optional(),
    isOut: z.boolean().optional(),
  }),
  about: z.object({
    atBatIndex: z.number(),
    halfInning: z.string(),
    isTopInning: z.boolean(),
    inning: z.number(),
    isScoringPlay: z.boolean().optional(),
  }),
  playEvents: z.array(playEventSchema),
});

const liveFeedResponseSchema = z.object({
  copyright: z.string().optional(),
  gamePk: z.number(),
  gameData: z.object({
    status: statusSchema,
    teams: z.object({ away: teamSchema, home: teamSchema }),
    venue: venueSchema,
  }),
  liveData: z.object({
    plays: z.object({ allPlays: z.array(playSchema) }),
    linescore: linescoreSchema,
  }),
});

const playbackSchema = z.object({
  name: z.string(),
  url: z.string(),
  width: z.string().optional(),
  height: z.string().optional(),
});

const highlightItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  blurb: z.string(),
  description: z.string().optional(),
  duration: z.string().optional(),
  date: z.string().optional(),
  playbacks: z.array(playbackSchema),
});

const highlightListSchema = z.object({
  title: z.string().optional(),
  items: z.array(highlightItemSchema),
});

const editorialSlotSchema = z.object({
  mlb: z
    .object({
      blurb: z.string().optional(),
      headline: z.string().optional(),
      body: z.string().optional(),
    })
    .optional(),
});

const gameContentResponseSchema = z.object({
  copyright: z.string().optional(),
  link: z.string().optional(),
  highlights: z
    .object({
      // Unused placements come back as `null` rather than being omitted.
      highlights: highlightListSchema.nullable().optional(),
      gameCenter: highlightListSchema.nullable().optional(),
      scoreboard: highlightListSchema.nullable().optional(),
      live: highlightListSchema.nullable().optional(),
    })
    .optional(),
  editorial: z
    .object({
      recap: editorialSlotSchema.nullable().optional(),
      preview: editorialSlotSchema.nullable().optional(),
      wrap: editorialSlotSchema.nullable().optional(),
    })
    .optional(),
});

/** Throws `ZodError` when a field BT depends on is missing or mistyped. */
export function parseScheduleResponse(input: unknown): ScheduleResponse {
  return scheduleResponseSchema.parse(input);
}

export function parseLiveFeedResponse(input: unknown): LiveFeedResponse {
  return liveFeedResponseSchema.parse(input);
}

export function parseGameContentResponse(input: unknown): GameContentResponse {
  return gameContentResponseSchema.parse(input);
}

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

// People carry `fullName`, not `name` — see `Person` in ./common.ts.
const personSchema = z.object({
  id: z.number(),
  link: z.string().optional(),
  fullName: z.string().optional(),
});

const codedDescriptionSchema = z.object({
  code: z.string(),
  description: z.string(),
});

const linescoreInningSchema = z.object({
  num: z.number(),
  ordinalNum: z.string(),
});

const linescoreTeamLineSchema = z.object({
  runs: z.number().optional(),
  hits: z.number().optional(),
  errors: z.number().optional(),
  leftOnBase: z.number().optional(),
});

const linescoreSchema = z.object({
  innings: z.array(linescoreInningSchema),
  teams: z
    .object({
      home: linescoreTeamLineSchema.optional(),
      away: linescoreTeamLineSchema.optional(),
    })
    .optional(),
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

const countSchema = z.object({
  balls: z.number().optional(),
  strikes: z.number().optional(),
  outs: z.number().optional(),
});

const playEventSchema = z.object({
  index: z.number(),
  isPitch: z.boolean(),
  type: z.string().optional(),
  playId: z.string().optional(),
  pitchNumber: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  count: countSchema.optional(),
  details: z
    .object({
      call: codedDescriptionSchema.optional(),
      description: z.string().optional(),
      code: z.string().optional(),
      ballColor: z.string().optional(),
      isInPlay: z.boolean().optional(),
      isStrike: z.boolean().optional(),
      isBall: z.boolean().optional(),
      isOut: z.boolean().optional(),
      type: z
        .object({ code: z.string().optional(), description: z.string().optional() })
        .optional(),
    })
    .optional(),
  pitchData: z
    .object({
      startSpeed: z.number().optional(),
      endSpeed: z.number().optional(),
      strikeZoneTop: z.number().optional(),
      strikeZoneBottom: z.number().optional(),
      zone: z.number().optional(),
      plateTime: z.number().optional(),
      extension: z.number().optional(),
      coordinates: pitchCoordinatesSchema.optional(),
      breaks: z
        .object({
          breakAngle: z.number().optional(),
          breakLength: z.number().optional(),
          spinRate: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  hitData: z
    .object({
      launchSpeed: z.number().optional(),
      launchAngle: z.number().optional(),
      totalDistance: z.number().optional(),
      trajectory: z.string().optional(),
      coordinates: z
        .object({ coordX: z.number().optional(), coordY: z.number().optional() })
        .optional(),
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
    isComplete: z.boolean().optional(),
    isScoringPlay: z.boolean().optional(),
  }),
  count: countSchema.optional(),
  matchup: z
    .object({
      batter: personSchema.optional(),
      pitcher: personSchema.optional(),
      batSide: codedDescriptionSchema.optional(),
      pitchHand: codedDescriptionSchema.optional(),
    })
    .optional(),
  playEvents: z.array(playEventSchema),
});

const liveFeedResponseSchema = z.object({
  copyright: z.string().optional(),
  gamePk: z.number(),
  gameData: z.object({
    datetime: z
      .object({
        dateTime: z.string().optional(),
        originalDate: z.string().optional(),
        officialDate: z.string().optional(),
        dayNight: z.string().optional(),
      })
      .optional(),
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
  slug: z.string().optional(),
  title: z.string(),
  blurb: z.string(),
  description: z.string().optional(),
  duration: z.string().optional(),
  date: z.string().optional(),
  mediaPlaybackId: z.string().optional(),
  mediaPlaybackUrl: z.string().optional(),
  image: z
    .object({
      title: z.string().optional(),
      templateUrl: z.string().optional(),
      cuts: z
        .array(
          z.object({
            aspectRatio: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            src: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
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

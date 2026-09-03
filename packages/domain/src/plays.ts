export type PitchKinematics = {
  pX: number;
  pZ: number;
  x0: number;
  y0: number;
  z0: number;
  vx0: number;
  vy0: number;
  vz0: number;
  ax: number;
  ay: number;
  az: number;
  pfxX: number;
  pfxZ: number;
};

export type PitchBreaks = {
  breakAngle: number;
  breakLength: number;
  spinRate: number;
};

export type PitchData = {
  startSpeed: number;
  endSpeed: number;
  strikeZoneTop: number;
  strikeZoneBottom: number;
  zone: number | null;
  plateTime: number | null;
  extension: number | null;
  coordinates: PitchKinematics;
  breaks: PitchBreaks | null;
};

export type HitData = {
  launchSpeed: number;
  launchAngle: number;
  totalDistance: number;
  trajectory: string;
  coordinates: { coordX: number; coordY: number };
};

export type PitchEvent = {
  pitchNumber: number;
  playId: string;
  startTime: string;
  details: {
    call: string | null;
    callDescription: string | null;
    type: string | null;
    typeDescription: string | null;
    isBall: boolean;
    isStrike: boolean;
    isInPlay: boolean;
    ballColor: string | null;
  };
  count: { balls: number; strikes: number; outs: number };
  pitchData: PitchData | null;
  hitData: HitData | null;
};

export type AtBat = {
  about: {
    atBatIndex: number;
    halfInning: "top" | "bottom";
    inning: number;
    isComplete: boolean;
    isScoringPlay: boolean;
  };
  result: {
    event: string;
    description: string;
    eventType: string;
    isOut: boolean;
    rbi: number;
  };
  matchup: {
    batter: { id: number; fullName: string };
    pitcher: { id: number; fullName: string };
    batSide: string | null;
    pitchHand: string | null;
  };
  count: { balls: number; strikes: number; outs: number };
  pitches: PitchEvent[];
};

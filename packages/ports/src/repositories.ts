import type { GameSnapshot, ScheduleDay } from "@bt/domain";

export interface ScheduleRepository {
  getByDate(date: string): Promise<ScheduleDay | null>;
  upsert(day: ScheduleDay): Promise<void>;
}

export interface GameRepository {
  getByPk(gamePk: number): Promise<GameSnapshot | null>;
  upsert(game: GameSnapshot): Promise<void>;
  listByDate(date: string): Promise<GameSnapshot[]>;
}

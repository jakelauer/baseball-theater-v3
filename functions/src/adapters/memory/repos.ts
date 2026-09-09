import type { GameProjection, GameSnapshot, ScheduleDay } from "@bt/domain";
import type { GameRepository, ScheduleRepository } from "@bt/ports";
import type { GameProjectionRepository } from "../../services/projection-store.js";

export class InMemoryScheduleRepository implements ScheduleRepository {
  private readonly byDate = new Map<string, ScheduleDay>();

  async getByDate(date: string): Promise<ScheduleDay | null> {
    return this.byDate.get(date) ?? null;
  }

  async upsert(day: ScheduleDay): Promise<void> {
    this.byDate.set(day.date, day);
  }

  clear(): void {
    this.byDate.clear();
  }
}

export class InMemoryGameRepository implements GameRepository {
  private readonly byPk = new Map<number, GameSnapshot>();

  async getByPk(gamePk: number): Promise<GameSnapshot | null> {
    return this.byPk.get(gamePk) ?? null;
  }

  async upsert(game: GameSnapshot): Promise<void> {
    this.byPk.set(game.gamePk, game);
  }

  async listByDate(date: string): Promise<GameSnapshot[]> {
    return [...this.byPk.values()].filter((g) => g.officialDate === date);
  }

  clear(): void {
    this.byPk.clear();
  }
}

export class InMemoryGameProjectionRepository implements GameProjectionRepository {
  private readonly byPk = new Map<number, GameProjection>();

  async getByPk(gamePk: number): Promise<GameProjection | null> {
    return this.byPk.get(gamePk) ?? null;
  }

  async upsert(projection: GameProjection): Promise<void> {
    this.byPk.set(projection.header.gamePk, projection);
  }

  clear(): void {
    this.byPk.clear();
  }
}

import type {
	GameProjection, GameSnapshot, ScheduleDay,
} from "@bt/domain";
import type {
	GameProjectionRepository,
	GameRepository,
	ReplayArtifact,
	ReplayArtifactRepository,
	ScheduleRepository,
} from "@bt/ports";

/** A JSON round-trip: what a Postgres `jsonb` column hands back, and never the caller's object. */
function jsonCopy<T>(value: T): T
{
	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The behavior every in-memory test double shares, so they match the Postgres
 * adapter (S50) under the shared contract (S46): values are stored and read as
 * JSON copies (no aliasing — mutating a written or returned value never changes
 * the store), and a write applies only if its version is newer — the
 * `applyIfNewer` rule (ADR-022), over a version read by `versionOf` because a
 * projection carries it on its header.
 */
class VersionedMemoryStore<K, T>
{
	private readonly entries = new Map<K, T>();

	constructor(private readonly versionOf: (value: T) => number) {}

	get(key: K): T | null
	{
		const value = this.entries.get(key);
		return value === undefined ? null : jsonCopy(value);
	}

	put(key: K, value: T): void
	{
		const current = this.entries.get(key);
		if (current !== undefined && this.versionOf(value) <= this.versionOf(current)) return;
		this.entries.set(key, jsonCopy(value));
	}

	values(): T[]
	{
		return [...this.entries.values()].map(jsonCopy);
	}

	clear(): void
	{
		this.entries.clear();
	}
}

export class InMemoryScheduleRepository implements ScheduleRepository
{
	private readonly store = new VersionedMemoryStore<string, ScheduleDay>((d) => d.version);

	async getByDate(date: string): Promise<ScheduleDay | null>
	{
		return this.store.get(date);
	}

	async upsert(day: ScheduleDay): Promise<void>
	{
		this.store.put(day.date, day);
	}

	clear(): void
	{
		this.store.clear();
	}
}

export class InMemoryGameRepository implements GameRepository
{
	private readonly store = new VersionedMemoryStore<number, GameSnapshot>((g) => g.version);

	async getByPk(gamePk: number): Promise<GameSnapshot | null>
	{
		return this.store.get(gamePk);
	}

	async upsert(game: GameSnapshot): Promise<void>
	{
		this.store.put(game.gamePk, game);
	}

	async listByDate(date: string): Promise<GameSnapshot[]>
	{
		return this.store.values().filter((g) => g.officialDate === date);
	}

	clear(): void
	{
		this.store.clear();
	}
}

export class InMemoryGameProjectionRepository implements GameProjectionRepository
{
	private readonly store = new VersionedMemoryStore<number, GameProjection>((p) => p.header.version);

	async getByPk(gamePk: number): Promise<GameProjection | null>
	{
		return this.store.get(gamePk);
	}

	async upsert(projection: GameProjection): Promise<void>
	{
		this.store.put(projection.header.gamePk, projection);
	}

	clear(): void
	{
		this.store.clear();
	}
}

export class InMemoryReplayArtifactRepository implements ReplayArtifactRepository
{
	private readonly store = new VersionedMemoryStore<number, ReplayArtifact>((a) => a.version);

	async getByPk(gamePk: number): Promise<ReplayArtifact | null>
	{
		return this.store.get(gamePk);
	}

	async upsert(artifact: ReplayArtifact): Promise<void>
	{
		this.store.put(artifact.gamePk, artifact);
	}

	clear(): void
	{
		this.store.clear();
	}
}

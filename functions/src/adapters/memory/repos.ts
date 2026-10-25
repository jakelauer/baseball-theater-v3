import type {
	Entitlements, GameProjection, GameSnapshot, ScheduleDay, UserProfile,
} from "@bt/domain";
import type {
	GameProjectionRepository,
	GameRepository,
	ReplayArtifact,
	ReplayArtifactRepository,
	DeletionLog,
	DeletionLogEntry,
	DeletionTokenRepository,
	ScheduleRepository,
	UserDataExport,
	UserRepository,
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

/**
 * Users and their identity links (ADR-019), stored as JSON copies like the
 * other doubles. Users carry no version: a user record changes by explicit
 * edits (profile, Patreon sync), not by ingest re-deliveries, so last write wins.
 */
export class InMemoryUserRepository implements UserRepository
{
	private readonly byUid = new Map<string, UserProfile>();
	/** `"<provider>\u0000<subject>"` → uid; NUL can't occur in either part, so keys can't collide. */
	private readonly links = new Map<string, string>();

	async getByUid(uid: string): Promise<UserProfile | null>
	{
		const user = this.byUid.get(uid);
		return user === undefined ? null : jsonCopy(user);
	}

	async upsert(user: UserProfile): Promise<void>
	{
		this.byUid.set(user.uid, jsonCopy(user));
	}

	async setEntitlements(uid: string, entitlements: Entitlements): Promise<void>
	{
		const existing = this.byUid.get(uid);
		if (!existing) return;
		this.byUid.set(uid, {
			...existing,
			entitlements: jsonCopy(entitlements),
			updatedAt: new Date().toISOString(),
		});
	}

	async linkIdentity(provider: string, subject: string, uid: string): Promise<void>
	{
		const key = `${provider}\u0000${subject}`;
		const linked = this.links.get(key);
		if (linked !== undefined && linked !== uid)
		{
			throw new Error(`${provider} account ${subject} is already linked to another user`);
		}
		this.links.set(key, uid);
	}

	async getByIdentity(provider: string, subject: string): Promise<string | null>
	{
		return this.links.get(`${provider}\u0000${subject}`) ?? null;
	}

	async exportFor(uid: string): Promise<UserDataExport | null>
	{
		const profile = await this.getByUid(uid);
		const identities = this.linkKeysFor(uid).map((key) =>
		{
			const [provider = "", subject = ""] = key.split("\u0000");
			return {
				provider,
				subject,
			};
		});
		return profile === null && identities.length === 0 ? null : {
			profile,
			identities,
		};
	}

	async deleteFor(uid: string): Promise<void>
	{
		this.byUid.delete(uid);
		for (const key of this.linkKeysFor(uid)) this.links.delete(key);
	}

	/** Every link key that resolves to `uid`. A scan is fine for a test double; Postgres indexes it (S50). */
	private linkKeysFor(uid: string): string[]
	{
		return [...this.links].filter(([, linked]) => linked === uid).map(([key]) => key);
	}
}

/**
 * The deletion log (ADR-028): uid and time only, kept after a deletion so a
 * restored backup can be cleaned again. Append-only; nothing here deletes from it.
 */
export class InMemoryDeletionLog implements DeletionLog
{
	private readonly entries: DeletionLogEntry[] = [];

	async record(entry: DeletionLogEntry): Promise<void>
	{
		this.entries.push(jsonCopy(entry));
	}

	async list(): Promise<DeletionLogEntry[]>
	{
		return jsonCopy(this.entries);
	}
}

/** Unused deletion tokens by ID → expiry. Holds no personal field: the bound uid is inside the signed token. */
export class InMemoryDeletionTokenRepository implements DeletionTokenRepository
{
	private readonly expiries = new Map<string, string>();

	async add(tokenId: string, expiresAt: string): Promise<void>
	{
		this.expiries.set(tokenId, expiresAt);
	}

	async get(tokenId: string): Promise<string | null>
	{
		return this.expiries.get(tokenId) ?? null;
	}

	async consume(tokenId: string): Promise<void>
	{
		this.expiries.delete(tokenId);
	}
}

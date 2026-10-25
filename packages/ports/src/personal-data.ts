/**
 * One place BT keeps personal data (ADR-028): a database table, an outside
 * service such as Logto or Patreon, or the browser. Export and deletion walk
 * the registry of these (`functions/src/services/personal-data.ts`), so data a
 * store doesn't cover can't be reached by either; the classification manifest
 * fails the build when something personal isn't covered.
 */
export interface PersonalDataStore
{
	/** The store's row in ADR-028's inventory table, verbatim (its **Where** column), e.g. `"BT database: users"`. */
	readonly name: string;
	/** Everything this store holds for `uid`, as JSON-safe data for the user's download; null when it holds nothing. */
	exportFor(uid: string): Promise<unknown>;
	/**
	 * Removes everything this store holds for `uid` and nothing of anyone else's.
	 * Idempotent: deleting a user with nothing stored (or already deleted) is a
	 * no-op, so a deletion that failed partway can simply run again.
	 */
	deleteFor(uid: string): Promise<void>;
}

/** One finished account deletion. Only the uid and the time: nothing else about the user survives it. */
export interface DeletionLogEntry
{
	uid: string;
	/** ISO time the deletion finished. */
	deletedAt: string;
}

/**
 * The record of deleted uids (ADR-028), the one thing BT keeps after a deletion.
 * A restored backup would bring deleted users back, so `reapplyDeletions`
 * walks this log after any restore and deletes them again. Never a registered
 * store: deleting a user must add to it, not remove from it.
 */
export interface DeletionLog
{
	record(entry: DeletionLogEntry): Promise<void>;
	list(): Promise<DeletionLogEntry[]>;
}

/**
 * Deletion tokens an export issued and nothing has used yet (ADR-028: the
 * delete request carries proof the export came first). A record is the token's
 * ID and expiry only; the uid it is bound to lives in the signed token itself.
 */
export interface DeletionTokenRepository
{
	add(tokenId: string, expiresAt: string): Promise<void>;
	/** The token's expiry when it was issued and not yet consumed, else null. */
	get(tokenId: string): Promise<string | null>;
	/** Makes the token unusable; a no-op when it already is. */
	consume(tokenId: string): Promise<void>;
}

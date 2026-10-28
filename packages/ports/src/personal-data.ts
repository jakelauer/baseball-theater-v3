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

/** A stored download's record: whose it is and when it was made and ages out (ISO times). */
export interface DataDownload
{
	id: string;
	uid: string;
	createdAt: string;
	/** `downloadExpiresAt(createdAt)`: 14 days on (ADR-028). */
	expiresAt: string;
}

/**
 * Where data downloads are kept (ADR-028's "Cloud storage: data downloads": R2
 * with a 14-day lifecycle rule in production; in memory locally). Download and
 * deletion are separate (owner, 2026-10-27), so this only stores files and
 * answers who may read them. It is itself a registered personal data store:
 * `exportFor` returns the records only, never the files, or each download would
 * contain the one before it, and `deleteFor` removes the files and records.
 * A download's `createdAt` is its request time, so the records are also what
 * the twice-in-24-hours limit counts.
 */
export interface ExportStore
{
	/** Keeps `file` as the download `download` describes. */
	put(download: DataDownload, file: unknown): Promise<void>;
	/** `uid`'s downloads that haven't aged out by `now`, oldest first. */
	list(uid: string, now: Date): Promise<DataDownload[]>;
	/** The file of download `id` when it is `uid`'s and hasn't aged out by `now`, else null. */
	file(uid: string, id: string, now: Date): Promise<unknown>;
	/** Every download record held for `uid` (no files); null when there are none. */
	exportFor(uid: string): Promise<DataDownload[] | null>;
	deleteFor(uid: string): Promise<void>;
}

/** One email. `uid` is whose it is, so a mailer that keeps what it sent can delete it with the account. */
export interface MailMessage
{
	uid: string;
	to: string;
	subject: string;
	/** Plain text. Links to BT only: never personal data beyond the address it goes to. */
	text: string;
}

/**
 * Sends email (ADR-028's "Cloudflare Email" row; Cloudflare Email in
 * production, in memory locally). A sent message holds the address it went to,
 * so the mailer is registered as a personal data store too: `exportFor` and
 * `deleteFor` cover whatever it keeps of a user's messages, and a provider that
 * keeps nothing BT can reach answers null and does nothing.
 */
export interface Mailer
{
	send(message: MailMessage): Promise<void>;
	exportFor(uid: string): Promise<unknown>;
	deleteFor(uid: string): Promise<void>;
}

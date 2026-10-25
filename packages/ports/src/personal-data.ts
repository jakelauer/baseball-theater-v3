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

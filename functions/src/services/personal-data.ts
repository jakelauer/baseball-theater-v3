import type {
	ExportStore, Mailer, PersonalDataStore, SettingsRepository, UserRepository,
} from "@bt/ports";

/**
 * The personal data inventory in code (ADR-028). Each name is that store's row
 * in ADR-028's inventory table, verbatim (the S76 grader compares them); a store
 * the table doesn't list is an ADR amendment for the owner, not a new name here.
 */
export const USERS_STORE = "BT database: users";
export const SETTINGS_STORE = "BT database: settings";
export const DOWNLOADS_STORE = "Cloud storage: data downloads";
export const MAIL_STORE = "Cloudflare Email";

/** What the registry needs from the app's dependencies; grows as stores are added (S50 Postgres swaps the adapters). */
export type PersonalDataDeps = {
	users: UserRepository;
	settings: SettingsRepository;
	/** Stored data downloads (S80). */
	downloads: ExportStore;
	/** What the mailer keeps of the download-ready emails it sent (S80). */
	mailer: Mailer;
};

/**
 * Every place BT keeps personal data for these dependencies. Export and deletion
 * (S77) walk this list and nothing else, so a store that isn't returned here is
 * unreachable by both; the classification manifest (`data-classification.ts`)
 * fails the build when something personal names a store missing from it.
 *
 * The user repository is one store: its profile and its identity links are
 * deleted together, because a link without its profile would resolve to nobody.
 * The download store exports its records, not its files (see `ExportStore`).
 */
export function personalDataStores(deps: PersonalDataDeps): PersonalDataStore[]
{
	return [
		{
			name: USERS_STORE,
			exportFor: (uid) => deps.users.exportFor(uid),
			deleteFor: (uid) => deps.users.deleteFor(uid),
		},
		{
			name: SETTINGS_STORE,
			exportFor: (uid) => deps.settings.exportFor(uid),
			deleteFor: (uid) => deps.settings.deleteFor(uid),
		},
		{
			name: DOWNLOADS_STORE,
			exportFor: (uid) => deps.downloads.exportFor(uid),
			deleteFor: (uid) => deps.downloads.deleteFor(uid),
		},
		{
			name: MAIL_STORE,
			exportFor: (uid) => deps.mailer.exportFor(uid),
			deleteFor: (uid) => deps.mailer.deleteFor(uid),
		},
	];
}

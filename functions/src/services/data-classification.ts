import type { UserProfile } from "@bt/domain";
import { USERS_STORE } from "./personal-data.js";

/**
 * Whether something BT keeps is personal data (ADR-028). A `personal` label
 * names the registered `PersonalDataStore` that deletes it, so labeling data
 * personal without a way to delete it fails `findUnlabeled`.
 */
export type DataLabel = PersonalLabel | NotPersonalLabel;

type PersonalLabel = {
	kind: "personal";
	/** The registered store (`personal-data.ts`) whose `deleteFor` removes it. */
	deletedBy: string;
};

type NotPersonalLabel = {
	kind: "none";
	/** Why it holds nothing personal, so a reviewer can check the claim. */
	why: string;
};

/**
 * The data classification manifest (ADR-028). Every repository class, every
 * `UserProfile` field and every adapter directory is labeled here; the test
 * beside this file discovers each of them from source and fails on any that is
 * missing. S50 adds the Postgres tables and columns in the same change that
 * creates them.
 */
export const DATA_CLASSIFICATION = {
	/** Classes in `functions/src/adapters/memory/repos.ts`. */
	repositoryClasses: {
		InMemoryScheduleRepository: {
			kind: "none",
			why: "MLB schedules; no user data",
		},
		InMemoryGameRepository: {
			kind: "none",
			why: "MLB game snapshots; no user data",
		},
		InMemoryGameProjectionRepository: {
			kind: "none",
			why: "projections of MLB games; no user data",
		},
		InMemoryReplayArtifactRepository: {
			kind: "none",
			why: "MLB live-feed replay patches; no user data",
		},
		InMemoryUserRepository: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
	},
	/** Typed as every key of `UserProfile`, so adding a field without a label doesn't compile either. */
	userProfileFields: {
		uid: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		email: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		displayName: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		patreonUserId: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		role: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		entitlements: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		favoriteTeamIds: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		createdAt: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		updatedAt: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
	} satisfies Record<keyof UserProfile, DataLabel>,
	/**
	 * Directories under `functions/src/adapters/`: each is an outside service or
	 * a storage backend, and either sends or keeps personal data or doesn't.
	 */
	adapterDirectories: {
		fixtures: {
			kind: "none",
			why: "committed MLB fixtures and the dev sign-in provider; stores nothing of its own",
		},
		http: {
			kind: "none",
			why: "the public MLB Stats API; requests carry no user data",
		},
		memory: {
			kind: "personal",
			deletedBy: USERS_STORE,
		},
		node: {
			kind: "none",
			why: "serves HTTP from Node; keeps nothing",
		},
	},
} satisfies Record<string, Record<string, DataLabel>>;

export type DataSection = keyof typeof DATA_CLASSIFICATION;

/**
 * Problems with a manifest section against what actually exists: names found
 * in source that have no label, and `personal` labels whose `deletedBy` isn't a
 * registered store. Empty means the section is complete.
 */
export function findUnlabeled(labels: Record<string, DataLabel>, found: string[], storeNames: string[]): string[]
{
	const problems = found.filter((name) => !(name in labels)).map((name) => `${name} is unlabeled`);
	for (const [name, label] of Object.entries(labels))
	{
		if (label.kind === "personal" && !storeNames.includes(label.deletedBy))
		{
			problems.push(`${name} is deleted by "${label.deletedBy}", which is not a registered store`);
		}
	}
	return problems;
}

import type {
	IdentityAccount, IdentityAdmin, IdentityClaims, IdentityProvider, SecretsProvider,
} from "@bt/ports";
import type { AccountDataDeps } from "../../services/account-deletion.js";
import { DELETION_TOKEN_PURPOSE } from "../../services/account-deletion.js";
import type { AuthDeps } from "../../services/accounts.js";
import { DEV_TOKEN_PREFIX } from "../../services/accounts.js";
import type { PersonalDataDeps } from "../../services/personal-data.js";
import { personalDataStores } from "../../services/personal-data.js";
import { createSessionSigner, SESSION_KEY_SECRET } from "../../services/session.js";
import { createSignedTokens } from "../../services/signed-token.js";
import {
	InMemoryDeletionLog, InMemoryDeletionTokenRepository, InMemoryUserRepository,
} from "../memory/repos.js";

/** The one address every `dev:` account has, so tests and Settings ("Signed in as …") can expect it. */
export const DEV_EMAIL = "dev@local.test";

/**
 * Local/CI identity provider (ADR-013, ADR-019): `dev:<uid>` signs in as that
 * uid with a verified {@link DEV_EMAIL}, no network and no Logto. Only wired
 * where dev sign-in is allowed (local server, tests), never in production.
 */
export class DevIdentityProvider implements IdentityProvider
{
	async completeSignIn(credential: string): Promise<IdentityClaims>
	{
		const subject = credential.startsWith(DEV_TOKEN_PREFIX) ? credential.slice(DEV_TOKEN_PREFIX.length) : "";
		if (!subject) throw new Error(`a dev sign-in is "${DEV_TOKEN_PREFIX}<uid>"`);
		return {
			provider: "dev",
			subject,
			email: DEV_EMAIL,
			emailVerified: true,
		};
	}
}

/**
 * The admin side of the dev provider (S77): `dev` accounts exist only as BT's
 * own links, so there is nothing to list, and disabling or deleting one just
 * records the subject, which tests read to prove deletion reached the provider.
 */
export class DevIdentityAdmin implements IdentityAdmin
{
	readonly provider = "dev";
	readonly disabled: string[] = [];
	readonly deleted: string[] = [];

	async listAccounts(): Promise<IdentityAccount[]>
	{
		return [];
	}

	async disableAccount(subject: string): Promise<void>
	{
		this.disabled.push(subject);
	}

	async deleteAccount(subject: string): Promise<void>
	{
		this.deleted.push(subject);
	}
}

/** Secrets from the process environment (local server). */
export class EnvSecretsProvider implements SecretsProvider
{
	async get(name: string): Promise<string | null>
	{
		return process.env[name] ?? null;
	}
}

/** Fixed secrets, for tests and for local defaults layered under the environment. */
export class StaticSecretsProvider implements SecretsProvider
{
	constructor(private readonly values: Record<string, string>) {}

	async get(name: string): Promise<string | null>
	{
		return this.values[name] ?? null;
	}
}

/**
 * Auth for local dev and tests: in-memory users, sessions signed with a key
 * from `secrets` (a fixed test key by default), and `dev:` sign-in enabled.
 */
/** The fixed key tests and the dev defaults sign with. */
const DEV_SECRETS = new StaticSecretsProvider({
	[SESSION_KEY_SECRET]: "dev-session-key",
});

export function createDevAuth(secrets: SecretsProvider = DEV_SECRETS): AuthDeps
{
	return {
		users: new InMemoryUserRepository(),
		sessions: createSessionSigner(secrets),
		dev: new DevIdentityProvider(),
	};
}

/**
 * Export and deletion for local dev and tests (S77): the registry over `stores`,
 * the dev identity admin, in-memory deletion tokens and log, and deletion
 * tokens signed with the same key source as the session (another purpose).
 */
export function createDevAccountData(stores: PersonalDataDeps, secrets: SecretsProvider = DEV_SECRETS): AccountDataDeps & { identityAdmins: [DevIdentityAdmin] }
{
	return {
		users: stores.users,
		stores: personalDataStores(stores),
		identityAdmins: [new DevIdentityAdmin()],
		deletionTokens: new InMemoryDeletionTokenRepository(),
		deletionLog: new InMemoryDeletionLog(),
		tokens: createSignedTokens(secrets, DELETION_TOKEN_PURPOSE),
	};
}

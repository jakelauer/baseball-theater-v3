import type {
	IdentityClaims, IdentityProvider, SecretsProvider,
} from "@bt/ports";
import type { AuthDeps } from "../../services/accounts.js";
import { DEV_TOKEN_PREFIX } from "../../services/accounts.js";
import { createSessionSigner, SESSION_KEY_SECRET } from "../../services/session.js";
import { InMemoryUserRepository } from "../memory/repos.js";

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
export function createDevAuth(secrets: SecretsProvider = new StaticSecretsProvider({
	[SESSION_KEY_SECRET]: "dev-session-key",
})): AuthDeps
{
	return {
		users: new InMemoryUserRepository(),
		sessions: createSessionSigner(secrets),
		dev: new DevIdentityProvider(),
	};
}

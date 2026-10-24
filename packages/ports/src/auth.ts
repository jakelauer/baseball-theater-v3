import type { Entitlements, UserProfile } from "@bt/domain";

/**
 * Who a sign-in proved the user to be, as the identity provider sees them
 * (ADR-019). `provider` + `subject` is the provider's own key for the account;
 * BT never uses it as a user ID, only to find the BT `uid` it is linked to.
 */
export interface IdentityClaims
{
	/** Which provider vouched for this account, e.g. `"logto"`, or `"dev"` locally. */
	provider: string;
	/** The provider's stable ID for the account. */
	subject: string;
	email: string | null;
	/** Whether the provider confirmed the user controls `email`; relinking by email (ADR-019) trusts only verified addresses. */
	emailVerified: boolean;
}

/**
 * The sign-in side of an identity provider (ADR-019; grows from the old
 * `AuthVerifier`). Called once per sign-in, never per request: after it, BT
 * issues its own session, so ordinary requests touch no provider.
 */
export interface IdentityProvider
{
	/**
	 * Finishes a sign-in from what the provider handed back (Logto: the redirect
	 * callback URL; the local dev provider: a `dev:<uid>` token). Throws when the
	 * provider rejects it.
	 */
	completeSignIn(callback: string): Promise<IdentityClaims>;
}

/** One account as the identity provider lists it. */
export interface IdentityAccount
{
	subject: string;
	email: string | null;
	disabled: boolean;
}

/**
 * The few account operations BT needs from the provider's admin side
 * (ADR-019: minimal on purpose, so switching providers stays cheap).
 */
export interface IdentityAdmin
{
	listAccounts(): Promise<IdentityAccount[]>;
	/** Blocks further sign-ins; existing BT sessions run out on their own expiry. */
	disableAccount(subject: string): Promise<void>;
	deleteAccount(subject: string): Promise<void>;
}

/**
 * BT's user records. BT owns `uid` (ADR-019): each provider account is linked
 * to one `uid` by `(provider, subject)`, and a user may have several links
 * (e.g. email now, a social login later).
 */
export interface UserRepository
{
	getByUid(uid: string): Promise<UserProfile | null>;
	upsert(user: UserProfile): Promise<void>;
	setEntitlements(uid: string, entitlements: Entitlements): Promise<void>;
	/**
	 * Links a provider account to a BT user. Linking the same account to the same
	 * `uid` again is a no-op; linking it to a different `uid` throws, because one
	 * provider account must never resolve to two BT users.
	 */
	linkIdentity(provider: string, subject: string, uid: string): Promise<void>;
	/** The BT `uid` a provider account is linked to, or null when it isn't linked. */
	getByIdentity(provider: string, subject: string): Promise<string | null>;
}

export interface SecretsProvider
{
	get(name: string): Promise<string | null>;
}

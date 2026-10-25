/**
 * Turning a completed sign-in into a BT user and session (ADR-019), and a
 * request's `Authorization` header back into a session.
 *
 * BT owns the user ID: a provider account is looked up by `(provider, subject)`
 * and, on its first sign-in, gets a new BT user linked to it. After that the
 * session BT issues is all an ordinary request needs.
 */
import type { BtSession, UserProfile } from "@bt/domain";
import { entitlementsForTier } from "@bt/domain";
import type {
	IdentityClaims, IdentityProvider, UserRepository,
} from "@bt/ports";
import type { SessionSigner } from "./session.js";

export type AuthDeps = {
	users: UserRepository;
	sessions: SessionSigner;
	/**
	 * The local/CI identity provider that accepts `Bearer dev:<uid>` directly
	 * (`DevIdentityProvider`). Absent in production, where a `dev:` token is just
	 * an invalid session.
	 */
	dev?: IdentityProvider;
	now?: () => Date;
};

/** A completed sign-in: the token to hand the client, and the session it carries. */
export type SignedIn = {
	token: string;
	session: BtSession;
};

/** The prefix of a local/CI bearer token that signs in as the named uid (ADR-013 local auth). */
export const DEV_TOKEN_PREFIX = "dev:";

/**
 * Finds or creates the BT user for a provider account and issues their
 * session. `newUid` names a first-time user; it defaults to a random UUID, and
 * the dev provider passes the subject so `dev:test-user` is uid `test-user`.
 */
export async function signIn(
	deps: AuthDeps,
	claims: IdentityClaims,
	newUid: () => string = () => crypto.randomUUID(),
): Promise<SignedIn>
{
	let uid = await deps.users.getByIdentity(claims.provider, claims.subject);
	let user = uid ? await deps.users.getByUid(uid) : null;
	if (!user)
	{
		uid ??= newUid();
		const now = (deps.now?.() ?? new Date()).toISOString();
		user = {
			uid,
			email: claims.email,
			displayName: null,
			patreonUserId: null,
			role: "member",
			entitlements: entitlementsForTier("none"),
			createdAt: now,
			updatedAt: now,
		};
		await deps.users.upsert(user);
		await deps.users.linkIdentity(claims.provider, claims.subject, uid);
	}
	const token = await deps.sessions.issue({
		uid: user.uid,
		role: user.role,
		entitlements: user.entitlements,
	});
	const session = await deps.sessions.verify(token);
	if (!session) throw new Error("a freshly issued session failed to verify");
	return {
		token,
		session,
	};
}

/**
 * The session a request carries in `Authorization: Bearer …`, or null when it
 * has none or an invalid one. A BT session token is verified by signature
 * alone. A `dev:` token, only when `deps.dev` is wired, signs in through the
 * dev provider first, so local requests exercise the same link-and-issue path
 * a real sign-in does.
 */
export async function authenticate(request: Request, deps: AuthDeps): Promise<BtSession | null>
{
	const header = request.headers.get("Authorization");
	if (!header?.startsWith("Bearer ")) return null;
	const token = header.slice("Bearer ".length).trim();
	if (deps.dev && token.startsWith(DEV_TOKEN_PREFIX))
	{
		const claims = await deps.dev.completeSignIn(token);
		return (await signIn(deps, claims, () => claims.subject)).session;
	}
	return deps.sessions.verify(token);
}

/**
 * The session a request carries **and** the account it still names, or null.
 * A session verifies by signature alone, so a deleted user's session keeps
 * verifying until it expires (S77); every route that acts for an account goes
 * through this one check rather than repeating the profile read (ADR-025).
 */
export async function authenticateAccount(request: Request, deps: AuthDeps): Promise<{ session: BtSession;
	user: UserProfile } | null>
{
	const session = await authenticate(request, deps);
	const user = session ? await deps.users.getByUid(session.uid) : null;
	return session && user ? {
		session,
		user,
	} : null;
}

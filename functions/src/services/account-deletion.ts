/**
 * Download, then delete (ADR-028). The export walks every registered personal
 * data store and hands back a single-use deletion token; the deletion accepts
 * only that token, the exact typed phrase and a recent sign-in, then erases the
 * user from every store and every identity provider at once.
 *
 * The order inside a deletion is what makes a failed attempt retryable with the
 * same session and token: identity links are read first (the provider accounts
 * need them), the outside providers and other stores go next, `BT database:
 * users` goes last (it holds the links and the account the retry authenticates
 * as), and only after all of that succeeds is the token consumed and the uid
 * logged. Every `deleteFor` is idempotent, so rerunning the steps that already
 * ran is harmless.
 */
import type {
	BtSession, MeDeleteRequest, MeExportResponse,
} from "@bt/domain";
import { ACCOUNT_DELETION_PHRASE } from "@bt/domain";
import type {
	DeletionLog, DeletionTokenRepository, IdentityAdmin, PersonalDataStore, UserRepository,
} from "@bt/ports";
import { USERS_STORE } from "./personal-data.js";
import type { SignedTokens } from "./signed-token.js";

/** How long an export's deletion token works (AC: within 15 minutes). */
export const DELETION_TOKEN_TTL_SECONDS = 15 * 60;

/** How recent the sign-in must be to delete (ADR-028's "recent sign-in"). */
export const RECENT_SIGN_IN_SECONDS = 10 * 60;

/** The signing purpose that keeps a deletion token from verifying as anything else. */
export const DELETION_TOKEN_PURPOSE = "account-deletion";

export type AccountDataDeps = {
	/** Read for the identity links a deletion must reach at each provider. */
	users: UserRepository;
	/** The registry (`personalDataStores`); export and deletion reach nothing else. */
	stores: PersonalDataStore[];
	/** One per identity provider BT links accounts from. */
	identityAdmins: IdentityAdmin[];
	deletionTokens: DeletionTokenRepository;
	deletionLog: DeletionLog;
	/** Signed with the session's key under {@link DELETION_TOKEN_PURPOSE}. */
	tokens: SignedTokens;
	now?: () => Date;
};

/** Why a deletion was refused, as the route answers it. */
export type DeletionRefusal =
	| { status: 403;
		error: "reauth_required" }
	| { status: 400;
		error: "phrase_mismatch" }
	| { status: 403;
		error: "export_required" };

/** What a deletion token carries, signed. The uid binding lives here, not in the token record. */
type DeletionClaims = {
	tokenId: string;
	uid: string;
	/** Unix seconds. */
	expiresAt: number;
};

function isDeletionClaims(value: unknown): value is DeletionClaims
{
	if (value === null || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	return typeof v.tokenId === "string" && typeof v.uid === "string" && typeof v.expiresAt === "number";
}

function nowSeconds(deps: AccountDataDeps): number
{
	return Math.floor((deps.now?.() ?? new Date()).getTime() / 1000);
}

/** The user's whole download plus a fresh single-use deletion token bound to them. */
export async function exportAccount(deps: AccountDataDeps, uid: string): Promise<MeExportResponse>
{
	const stores: Record<string, unknown> = {};
	for (const store of deps.stores) stores[store.name] = await store.exportFor(uid);

	const expiresAt = nowSeconds(deps) + DELETION_TOKEN_TTL_SECONDS;
	const claims: DeletionClaims = {
		tokenId: crypto.randomUUID(),
		uid,
		expiresAt,
	};
	const expiresIso = new Date(expiresAt * 1000).toISOString();
	await deps.deletionTokens.add(claims.tokenId, expiresIso);
	return {
		stores,
		deletionToken: await deps.tokens.sign(claims),
		deletionTokenExpiresAt: expiresIso,
	};
}

/** The token's claims when it is genuine, this user's, unexpired, and issued by an export and not yet used. */
async function acceptedToken(deps: AccountDataDeps, uid: string, token: string): Promise<DeletionClaims | null>
{
	const claims = await deps.tokens.verify(token);
	if (!isDeletionClaims(claims) || claims.uid !== uid || claims.expiresAt <= nowSeconds(deps)) return null;
	return await deps.deletionTokens.get(claims.tokenId) === null ? null : claims;
}

/**
 * Deletes everything of `session.uid`'s, or says why not. Checks, in order: the
 * sign-in is recent, the phrase is exact, the token came from this user's
 * export. Throws when a store or provider fails, leaving the token usable so
 * the same request can be retried.
 */
export async function deleteAccount(deps: AccountDataDeps, session: BtSession, request: MeDeleteRequest): Promise<DeletionRefusal | null>
{
	if (nowSeconds(deps) - session.issuedAt > RECENT_SIGN_IN_SECONDS) return {
		status: 403,
		error: "reauth_required",
	};
	if (request.phrase !== ACCOUNT_DELETION_PHRASE) return {
		status: 400,
		error: "phrase_mismatch",
	};
	const claims = await acceptedToken(deps, session.uid, request.deletionToken);
	if (!claims) return {
		status: 403,
		error: "export_required",
	};

	const identities = (await deps.users.exportFor(session.uid))?.identities ?? [];
	for (const admin of deps.identityAdmins)
	{
		for (const link of identities.filter((i) => i.provider === admin.provider)) await admin.deleteAccount(link.subject);
	}
	for (const store of deps.stores.filter((s) => s.name !== USERS_STORE)) await store.deleteFor(session.uid);
	for (const store of deps.stores.filter((s) => s.name === USERS_STORE)) await store.deleteFor(session.uid);

	await deps.deletionTokens.consume(claims.tokenId);
	await deps.deletionLog.record({
		uid: session.uid,
		deletedAt: (deps.now?.() ?? new Date()).toISOString(),
	});
	return null;
}

/**
 * After restoring a backup, deletes again every uid the deletion log names, from
 * every registered store (ADR-028: a restore must not bring deleted users back).
 * Returns how many logged uids it re-applied.
 */
export async function reapplyDeletions(deps: Pick<AccountDataDeps, "stores" | "deletionLog">): Promise<number>
{
	const entries = await deps.deletionLog.list();
	for (const { uid } of entries)
	{
		for (const store of deps.stores) await store.deleteFor(uid);
	}
	return entries.length;
}

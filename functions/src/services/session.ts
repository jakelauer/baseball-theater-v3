/**
 * BT's own signed session (ADR-019). After a sign-in, BT issues a token that
 * carries `uid`, role and entitlements, signed with HMAC-SHA-256 through
 * WebCrypto (`crypto.subtle`, the same API in Node and Workers). Verifying it
 * needs only the key: no Postgres read and no identity-provider call, which is
 * what keeps an ordinary request cheap and keeps Logto's token use near one per
 * sign-in.
 *
 * Token format: `<base64url(JSON claims)>.<base64url(HMAC of the first part)>`.
 * It is not encrypted; nothing in it is secret.
 */
import type { BtSession } from "@bt/domain";
import type { SecretsProvider } from "@bt/ports";

/** The secret the HMAC key is read from (a Worker secret in production; ADR-017). */
export const SESSION_KEY_SECRET = "BT_SESSION_KEY";

/** How long a session lasts. Role or entitlement changes reach a user no later than this. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** What the session's fields are, without the times the signer stamps. */
export type SessionGrant = Omit<BtSession, "issuedAt" | "expiresAt">;

export interface SessionSigner
{
	/** Stamps issue/expiry times on `grant` and returns the signed token. */
	issue(grant: SessionGrant): Promise<string>;
	/** The session a token carries, or null when it is malformed, forged or expired. */
	verify(token: string): Promise<BtSession | null>;
}

const encoder = new TextEncoder();

/** WebCrypto's key type, named without the DOM lib (this package compiles against Node's types only). */
type HmacKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>;

function toBase64Url(bytes: Uint8Array): string
{
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Null for anything that is not base64url, so a garbled token is rejected rather than thrown on. */
function fromBase64Url(text: string): Uint8Array | null
{
	if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
	try
	{
		const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	}
	catch
	{
		// A length no base64 string can have (one past a multiple of four).
		return null;
	}
}

/** True when `value` has every session field with the right type. Guards against a validly signed but older-shaped token. */
function isSession(value: unknown): value is BtSession
{
	if (value === null || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	return typeof v.uid === "string" && (v.role === "member" || v.role === "admin")
		&& v.entitlements !== null && typeof v.entitlements === "object"
		&& typeof v.issuedAt === "number" && typeof v.expiresAt === "number";
}

/**
 * A signer whose key is read once, on first use, from `secrets`. A missing key
 * throws: running without one would mean no request could ever be signed in.
 * `now` is injectable so tests can cross the expiry.
 */
export function createSessionSigner(secrets: SecretsProvider, now: () => Date = () => new Date()): SessionSigner
{
	let key: Promise<HmacKey> | undefined;
	const hmacKey = (): Promise<HmacKey> =>
	{
		key ??= secrets.get(SESSION_KEY_SECRET).then((secret) =>
		{
			if (!secret) throw new Error(`${SESSION_KEY_SECRET} is not set`);
			return crypto.subtle.importKey("raw", encoder.encode(secret), {
				name: "HMAC",
				hash: "SHA-256",
			}, false, ["sign", "verify"]);
		});
		return key;
	};
	const seconds = (): number => Math.floor(now().getTime() / 1000);

	return {
		async issue(grant)
		{
			const issuedAt = seconds();
			const session: BtSession = {
				...grant,
				issuedAt,
				expiresAt: issuedAt + SESSION_TTL_SECONDS,
			};
			const body = toBase64Url(encoder.encode(JSON.stringify(session)));
			const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body));
			return `${body}.${toBase64Url(new Uint8Array(signature))}`;
		},

		async verify(token)
		{
			const [body, signature, extra] = token.split(".");
			if (!body || !signature || extra !== undefined) return null;
			const signatureBytes = fromBase64Url(signature);
			const bodyBytes = fromBase64Url(body);
			if (!signatureBytes || !bodyBytes) return null;
			// crypto.subtle.verify compares in constant time, so the check leaks nothing about the expected signature.
			if (!await crypto.subtle.verify("HMAC", await hmacKey(), signatureBytes, encoder.encode(body))) return null;
			let claims: unknown;
			try
			{
				claims = JSON.parse(new TextDecoder().decode(bodyBytes));
			}
			catch
			{
				return null;
			}
			if (!isSession(claims) || claims.expiresAt <= seconds()) return null;
			return claims;
		},
	};
}

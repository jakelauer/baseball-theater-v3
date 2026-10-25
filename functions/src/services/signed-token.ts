/**
 * BT's one signing scheme (ADR-025: not a second one per feature): JSON claims
 * signed with HMAC-SHA-256 through WebCrypto (`crypto.subtle`, the same API in
 * Node and Workers), keyed by {@link SESSION_KEY_SECRET}. The session (S8) and
 * the account deletion token (S77) both use it.
 *
 * Token format: `<base64url(JSON claims)>.<base64url(HMAC)>`. The HMAC covers
 * `<purpose>.<first part>`, so a token signed for one purpose never verifies
 * for another (a deletion token can't be presented as a session). Not
 * encrypted; nothing in it is secret.
 */
import type { SecretsProvider } from "@bt/ports";

/** The secret the HMAC key is read from (a Worker secret in production; ADR-017). */
export const SESSION_KEY_SECRET = "BT_SESSION_KEY";

export interface SignedTokens
{
	sign(claims: object): Promise<string>;
	/** The parsed claims, or null when the token is malformed or its signature (for this purpose) is wrong. Expiry is the caller's. */
	verify(token: string): Promise<unknown>;
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

/**
 * Signs and verifies tokens for one `purpose`. The key is read once, on first
 * use, from `secrets`; a missing key throws, since without one nothing could
 * ever be signed.
 */
export function createSignedTokens(secrets: SecretsProvider, purpose: string): SignedTokens
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
	const signed = (body: string): Uint8Array => encoder.encode(`${purpose}.${body}`);

	return {
		async sign(claims)
		{
			const body = toBase64Url(encoder.encode(JSON.stringify(claims)));
			const signature = await crypto.subtle.sign("HMAC", await hmacKey(), signed(body));
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
			if (!await crypto.subtle.verify("HMAC", await hmacKey(), signatureBytes, signed(body))) return null;
			try
			{
				return JSON.parse(new TextDecoder().decode(bodyBytes)) as unknown;
			}
			catch
			{
				return null;
			}
		},
	};
}

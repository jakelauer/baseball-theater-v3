import { entitlementsForTier } from "@bt/domain";
import type { UserRepository } from "@bt/ports";
import {
	describe, expect, it, vi,
} from "vitest";
import { createDevAuth, StaticSecretsProvider } from "../adapters/fixtures/auth.js";
import { authenticate } from "./accounts.js";
import {
	createSessionSigner, SESSION_KEY_SECRET, SESSION_TTL_SECONDS, type SessionGrant,
} from "./session.js";

const grant: SessionGrant = {
	uid: "u1",
	role: "member",
	entitlements: entitlementsForTier("Pro Backer"),
};

function signer(key = "test-key", now?: () => Date)
{
	return createSessionSigner(new StaticSecretsProvider({
		[SESSION_KEY_SECRET]: key,
	}), now);
}

/** A UserRepository whose every method is a spy, to prove what a code path reads. */
function spyRepository(): UserRepository
{
	return {
		getByUid: vi.fn(),
		upsert: vi.fn(),
		setEntitlements: vi.fn(),
		linkIdentity: vi.fn(),
		getByIdentity: vi.fn(),
	};
}

describe("session signer", () =>
{
	it("round-trips uid, role and entitlements, stamped with issue and expiry times", async () =>
	{
		const now = new Date("2026-10-23T12:00:00Z");
		const sessions = signer("test-key", () => now);
		const session = await sessions.verify(await sessions.issue(grant));
		const issuedAt = now.getTime() / 1000;
		expect(session).toEqual({
			...grant,
			issuedAt,
			expiresAt: issuedAt + SESSION_TTL_SECONDS,
		});
	});

	it("rejects a token signed with another key, a tampered body, and garbage", async () =>
	{
		const token = await signer("test-key").issue(grant);
		expect(await signer("other-key").verify(token)).toBeNull();

		const [, signature] = token.split(".");
		const forged = btoa(JSON.stringify({
			...grant,
			role: "admin",
			issuedAt: 0,
			expiresAt: 4_000_000_000,
		})).replace(/=+$/, "");
		expect(await signer().verify(`${forged}.${signature}`)).toBeNull();

		for (const junk of ["", "abc", "a.b.c", "!!.??", "a.b", `${token}x`])
		{
			expect(await signer().verify(junk)).toBeNull();
		}
	});

	it("rejects an expired session", async () =>
	{
		let now = new Date("2026-10-23T12:00:00Z");
		const sessions = signer("test-key", () => now);
		const token = await sessions.issue(grant);
		now = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
		expect(await sessions.verify(token)).toBeNull();
	});

	it("rejects a validly signed body that isn't a session", async () =>
	{
		const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("test-key"), {
			name: "HMAC",
			hash: "SHA-256",
		}, false, ["sign"]);
		const b64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		for (const payload of ["not json", JSON.stringify({
			uid: "u1",
		})])
		{
			const body = b64(new TextEncoder().encode(payload));
			const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
			expect(await signer().verify(`${body}.${b64(signature)}`)).toBeNull();
		}
	});

	it("reads its key through SecretsProvider once, and refuses to run without one", async () =>
	{
		const secrets = new StaticSecretsProvider({
			[SESSION_KEY_SECRET]: "test-key",
		});
		const get = vi.spyOn(secrets, "get");
		const sessions = createSessionSigner(secrets);
		await sessions.verify(await sessions.issue(grant));
		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith(SESSION_KEY_SECRET);

		await expect(createSessionSigner(new StaticSecretsProvider({})).issue(grant)).rejects.toThrow(SESSION_KEY_SECRET);
	});
});

describe("authenticate with a BT session", () =>
{
	it("verifies by signature alone: no repository is read", async () =>
	{
		const users = spyRepository();
		const auth = {
			...createDevAuth(),
			users,
		};
		const token = await auth.sessions.issue(grant);
		const session = await authenticate(new Request("http://bt.test/api/v1/me", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}), auth);
		expect(session?.uid).toBe("u1");
		for (const method of Object.values(users))
		{
			expect(method).not.toHaveBeenCalled();
		}
	});
});

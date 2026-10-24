import {
	describe, expect, it,
} from "vitest";
import { createDevAuth, DevIdentityProvider } from "../adapters/fixtures/auth.js";
import { authenticate, signIn } from "./accounts.js";

function bearer(token: string): Request
{
	return new Request("http://bt.test/api/v1/me", {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
}

describe("signIn", () =>
{
	it("creates and links a BT user on first sign-in, and finds the same user after", async () =>
	{
		const auth = createDevAuth();
		const claims = {
			provider: "logto",
			subject: "sub-1",
			email: "fan@example.test",
			emailVerified: true,
		};
		const first = await signIn(auth, claims);
		expect(first.session.role).toBe("member");
		expect(first.session.entitlements.tier).toBe("none");
		expect(await auth.users.getByIdentity("logto", "sub-1")).toBe(first.session.uid);
		expect((await auth.users.getByUid(first.session.uid))?.email).toBe("fan@example.test");

		// The uid is BT's, not the provider's subject.
		expect(first.session.uid).not.toBe("sub-1");

		const second = await signIn(auth, claims);
		expect(second.session.uid).toBe(first.session.uid);
		expect(await auth.sessions.verify(second.token)).toEqual(second.session);
	});

	it("puts the stored role and entitlements in the session", async () =>
	{
		const auth = createDevAuth();
		const { session } = await signIn(auth, await new DevIdentityProvider().completeSignIn("dev:boss"), () => "boss");
		const user = await auth.users.getByUid(session.uid);
		await auth.users.upsert({
			...user!,
			role: "admin",
		});
		await auth.users.setEntitlements("boss", {
			...user!.entitlements,
			tier: "Star Backer",
		});
		await auth.users.setEntitlements("nobody", user!.entitlements);
		const again = await signIn(auth, await new DevIdentityProvider().completeSignIn("dev:boss"));
		expect(again.session.role).toBe("admin");
		expect(again.session.entitlements.tier).toBe("Star Backer");
	});
});

describe("authenticate", () =>
{
	it("is null without a bearer token or with an invalid one", async () =>
	{
		const auth = createDevAuth();
		expect(await authenticate(new Request("http://bt.test/"), auth)).toBeNull();
		expect(await authenticate(new Request("http://bt.test/", {
			headers: {
				Authorization: "Basic abc",
			},
		}), auth)).toBeNull();
		expect(await authenticate(bearer("not-a-session"), auth)).toBeNull();
	});

	it("signs a dev: token in as that uid, only when dev sign-in is wired", async () =>
	{
		const auth = createDevAuth();
		expect((await authenticate(bearer("dev:test-user"), auth))?.uid).toBe("test-user");
		const { dev: _dev, ...production } = auth;
		expect(await authenticate(bearer("dev:test-user"), production)).toBeNull();
	});
});

describe("DevIdentityProvider", () =>
{
	it("rejects anything but dev:<uid>", async () =>
	{
		const dev = new DevIdentityProvider();
		await expect(dev.completeSignIn("dev:")).rejects.toThrow();
		await expect(dev.completeSignIn("local:x")).rejects.toThrow();
	});
});

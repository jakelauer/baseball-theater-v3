/**
 * `GET /api/v1/me` over a real HTTP server (S8): signed out is 401, and the
 * local `dev:` bearer signs in as its uid with the fixed dev address that
 * Settings shows as "Signed in as {email}".
 */
import { createServer } from "node:http";
import {
	describe, expect, it,
} from "vitest";
import {
	createDevAccountData, createDevAuth, DEV_EMAIL,
} from "../adapters/fixtures/auth.js";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
	InMemorySettingsRepository,
} from "../adapters/memory/repos.js";
import { toNodeListener } from "../adapters/node/http.js";
import { signIn } from "../services/accounts.js";
import { handleApiRequest, type ApiContext } from "./api.js";

async function withServer(run: (base: string, ctx: ApiContext) => Promise<void>): Promise<void>
{
	const auth = createDevAuth();
	const settings = new InMemorySettingsRepository();
	const ctx: ApiContext = {
		ingest: {
			mlb: new FixtureMlbStatsClient(),
			schedules: new InMemoryScheduleRepository(),
			games: new InMemoryGameRepository(),
			projections: new InMemoryGameProjectionRepository(),
		},
		auth,
		settings,
		account: createDevAccountData({
			users: auth.users,
			settings,
		}),
	};
	const server = createServer(toNodeListener((request) => handleApiRequest(request, ctx)));
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const addr = server.address();
	if (!addr || typeof addr === "string") throw new Error("no port");
	try
	{
		await run(`http://127.0.0.1:${addr.port}`, ctx);
	}
	finally
	{
		await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
	}
}

describe("GET /api/v1/me", () =>
{
	it("is 401 without a session, or with an invalid one", async () =>
	{
		await withServer(async (base) =>
		{
			const none = await fetch(`${base}/api/v1/me`);
			expect(none.status).toBe(401);
			expect(await none.json()).toEqual({
				error: "unauthorized",
			});
			const forged = await fetch(`${base}/api/v1/me`, {
				headers: {
					Authorization: "Bearer e30.c2ln",
				},
			});
			expect(forged.status).toBe(401);
		});
	});

	it("is 200 with Authorization: Bearer dev:test-user, carrying that uid and the dev account's email", async () =>
	{
		await withServer(async (base) =>
		{
			const res = await fetch(`${base}/api/v1/me`, {
				headers: {
					Authorization: "Bearer dev:test-user",
				},
			});
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({
				uid: "test-user",
				email: DEV_EMAIL,
				role: "member",
				entitlements: {
					tier: "none",
					fasterLiveRefresh: false,
					cloudSyncedSettings: false,
					savantLinks: false,
				},
			});
		});
	});

	it("accepts the BT session a sign-in issued", async () =>
	{
		await withServer(async (base, ctx) =>
		{
			const { token, session } = await signIn(ctx.auth, {
				provider: "logto",
				subject: "sub-9",
				email: "fan@example.test",
				emailVerified: true,
			});
			const res = await fetch(`${base}/api/v1/me`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			expect(res.status).toBe(200);
			expect(await res.json()).toMatchObject({
				uid: session.uid,
				email: "fan@example.test",
			});
		});
	});
});

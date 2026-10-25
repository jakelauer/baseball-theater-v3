/**
 * `GET /api/v1/me/export` and `POST /api/v1/me/delete` over a real HTTP server
 * (S77, ADR-028): download first, then delete only after a recent sign-in, the
 * exact phrase and this user's export token, and afterwards nothing is left.
 *
 * Sessions here are BT-signed tokens from `signIn`, not `dev:` bearers: a
 * `dev:` bearer signs in afresh on every request, which would re-create the
 * deleted user. One clock drives both the session signer and the deletion
 * service, so tests can step past the 10- and 15-minute limits.
 */
import { createServer } from "node:http";
import type { MeExportResponse } from "@bt/domain";
import { ACCOUNT_DELETION_PHRASE } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import {
	createDevAccountData, createDevAuth, DEV_EMAIL, StaticSecretsProvider,
} from "../adapters/fixtures/auth.js";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
	InMemoryGameProjectionRepository,
	InMemoryGameRepository,
	InMemoryScheduleRepository,
} from "../adapters/memory/repos.js";
import { toNodeListener } from "../adapters/node/http.js";
import { signIn } from "../services/accounts.js";
import { USERS_STORE } from "../services/personal-data.js";
import { createSessionSigner, SESSION_KEY_SECRET } from "../services/session.js";
import { handleApiRequest, type ApiContext } from "./api.js";

const MINUTE = 60 * 1000;

type Harness = {
	base: string;
	ctx: ApiContext;
	admin: ReturnType<typeof createDevAccountData>["identityAdmins"][0];
	/** Moves the shared clock forward. */
	advance(ms: number): void;
	/** Signs `uid` in now (a fresh `dev` identity link) and returns its BT session token. */
	sessionFor(uid: string): Promise<string>;
	get(path: string, token?: string): Promise<Response>;
	post(path: string, body: unknown, token?: string): Promise<Response>;
};

async function withServer(run: (h: Harness) => Promise<void>): Promise<void>
{
	let now = new Date("2026-10-24T12:00:00Z").getTime();
	const clock = () => new Date(now);
	const secrets = new StaticSecretsProvider({
		[SESSION_KEY_SECRET]: "account-data-test-key",
	});
	const auth = {
		...createDevAuth(secrets),
		sessions: createSessionSigner(secrets, clock),
		now: clock,
	};
	const account = {
		...createDevAccountData(auth.users, secrets),
		now: clock,
	};
	const ctx: ApiContext = {
		ingest: {
			mlb: new FixtureMlbStatsClient(),
			schedules: new InMemoryScheduleRepository(),
			games: new InMemoryGameRepository(),
			projections: new InMemoryGameProjectionRepository(),
		},
		auth,
		account,
	};
	const server = createServer(toNodeListener((request) => handleApiRequest(request, ctx)));
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const addr = server.address();
	if (!addr || typeof addr === "string") throw new Error("no port");
	const base = `http://127.0.0.1:${addr.port}`;
	const headers = (token?: string): Record<string, string> => (token ? {
		Authorization: `Bearer ${token}`,
	} : {});
	try
	{
		await run({
			base,
			ctx,
			admin: account.identityAdmins[0],
			advance: (ms) =>
			{
				now += ms;
			},
			sessionFor: async (uid) => (await signIn(auth, {
				provider: "dev",
				subject: uid,
				email: DEV_EMAIL,
				emailVerified: true,
			}, () => uid)).token,
			get: (path, token) => fetch(`${base}${path}`, {
				headers: headers(token),
			}),
			post: (path, body, token) => fetch(`${base}${path}`, {
				method: "POST",
				headers: {
					...headers(token),
					"Content-Type": "application/json",
				},
				body: typeof body === "string" ? body : JSON.stringify(body),
			}),
		});
	}
	finally
	{
		await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
	}
}

async function exported(h: Harness, token: string): Promise<MeExportResponse>
{
	const res = await h.get("/api/v1/me/export", token);
	expect(res.status).toBe(200);
	return await res.json() as MeExportResponse;
}

describe("GET /api/v1/me/export", () =>
{
	it("export returns every registered store keyed by name, with a single-use token expiring within 15 minutes", async () =>
	{
		await withServer(async (h) =>
		{
			const token = await h.sessionFor("fan-1");
			const body = await exported(h, token);
			expect(Object.keys(body.stores)).toEqual(h.ctx.account.stores.map((s) => s.name));
			expect(body.stores[USERS_STORE]).toMatchObject({
				profile: {
					uid: "fan-1",
					email: DEV_EMAIL,
				},
				identities: [{
					provider: "dev",
					subject: "fan-1",
				}],
			});
			const expiresIn = new Date(body.deletionTokenExpiresAt).getTime() - new Date("2026-10-24T12:00:00Z").getTime();
			expect(expiresIn).toBeGreaterThan(0);
			expect(expiresIn).toBeLessThanOrEqual(15 * MINUTE);
			expect(body.deletionToken).toMatch(/^[\w-]+\.[\w-]+$/);
		});
	});

	it("export is 401 signed out", async () =>
	{
		await withServer(async (h) =>
		{
			expect((await h.get("/api/v1/me/export")).status).toBe(401);
		});
	});
});

describe("POST /api/v1/me/delete", () =>
{
	it("deletes the user from every store and the identity provider; the same session is then 401", async () =>
	{
		await withServer(async (h) =>
		{
			const token = await h.sessionFor("fan-1");
			// A second provider's link: the dev admin must not be asked to delete it.
			await h.ctx.auth.users.linkIdentity("logto", "logto-fan-1", "fan-1");
			const other = await h.sessionFor("fan-2");
			const { deletionToken } = await exported(h, token);

			const res = await h.post("/api/v1/me/delete", {
				phrase: ACCOUNT_DELETION_PHRASE,
				deletionToken,
			}, token);
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({
				deleted: true,
			});

			expect(h.admin.deleted).toEqual(["fan-1"]);
			expect((await h.get("/api/v1/me", token)).status).toBe(401);
			for (const store of h.ctx.account.stores) expect(await store.exportFor("fan-1")).toBeNull();
			expect(await h.ctx.auth.users.getByIdentity("logto", "logto-fan-1")).toBeNull();
			expect(await h.ctx.account.deletionLog.list()).toEqual([{
				uid: "fan-1",
				deletedAt: "2026-10-24T12:00:00.000Z",
			}]);
			// Another user is untouched.
			expect((await h.get("/api/v1/me", other)).status).toBe(200);
		});
	});

	describe("refuses", () =>
	{
		it("a sign-in older than 10 minutes (403 reauth_required)", async () =>
		{
			await withServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				const { deletionToken } = await exported(h, token);
				h.advance(10 * MINUTE + 1000);
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE,
					deletionToken,
				}, token);
				expect(res.status).toBe(403);
				expect(await res.json()).toEqual({
					error: "reauth_required",
				});
			});
		});

		it("a wrong phrase (400 phrase_mismatch), even one differing only in case", async () =>
		{
			await withServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				const { deletionToken } = await exported(h, token);
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE.toUpperCase(),
					deletionToken,
				}, token);
				expect(res.status).toBe(400);
				expect(await res.json()).toEqual({
					error: "phrase_mismatch",
				});
			});
		});

		it("a token without an export (403 export_required): forged, or validly signed but never issued", async () =>
		{
			await withServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				const neverIssued = await h.ctx.account.tokens.sign({
					tokenId: "not-from-an-export",
					uid: "fan-1",
					expiresAt: Date.parse("2026-10-24T12:10:00Z") / 1000,
				});
				// A session token is signed for another purpose, so it is no deletion token either.
				for (const deletionToken of ["forged.token", neverIssued, token])
				{
					const res = await h.post("/api/v1/me/delete", {
						phrase: ACCOUNT_DELETION_PHRASE,
						deletionToken,
					}, token);
					expect(res.status).toBe(403);
					expect(await res.json()).toEqual({
						error: "export_required",
					});
				}
				expect(await h.ctx.auth.users.getByUid("fan-1")).not.toBeNull();
			});
		});

		it("a used token (403 export_required)", async () =>
		{
			await withServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				const { deletionToken } = await exported(h, token);
				const body = {
					phrase: ACCOUNT_DELETION_PHRASE,
					deletionToken,
				};
				expect((await h.post("/api/v1/me/delete", body, token)).status).toBe(200);
				// The user signs up again with the same uid; the old token must not delete the new account.
				const again = await h.sessionFor("fan-1");
				const res = await h.post("/api/v1/me/delete", body, again);
				expect(res.status).toBe(403);
				expect(await h.ctx.auth.users.getByUid("fan-1")).not.toBeNull();
			});
		});

		it("an expired token (403 export_required)", async () =>
		{
			await withServer(async (h) =>
			{
				const { deletionToken } = await exported(h, await h.sessionFor("fan-1"));
				h.advance(15 * MINUTE + 1000);
				const fresh = await h.sessionFor("fan-1");
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE,
					deletionToken,
				}, fresh);
				expect(res.status).toBe(403);
				expect(await res.json()).toEqual({
					error: "export_required",
				});
			});
		});

		it("a token for another user (403 export_required)", async () =>
		{
			await withServer(async (h) =>
			{
				const { deletionToken } = await exported(h, await h.sessionFor("fan-2"));
				const token = await h.sessionFor("fan-1");
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE,
					deletionToken,
				}, token);
				expect(res.status).toBe(403);
				expect(await h.ctx.auth.users.getByUid("fan-2")).not.toBeNull();
			});
		});

		it("a body that isn't { phrase, deletionToken } (400), and no session (401)", async () =>
		{
			await withServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				expect((await h.post("/api/v1/me/delete", "not json", token)).status).toBe(400);
				expect((await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE,
				}, token)).status).toBe(400);
				expect((await h.post("/api/v1/me/delete", {})).status).toBe(401);
			});
		});
	});
});

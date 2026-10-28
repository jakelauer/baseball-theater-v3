/**
 * `POST /api/v1/me/delete` over a real HTTP server (S77, S80, ADR-028): deleting
 * needs only a recent sign-in and the exact phrase, no download first (owner,
 * 2026-10-27: "Deleting and downloading aren't connected"), and afterwards
 * nothing of the user's is left, stored downloads and sent email included.
 */
import { ACCOUNT_DELETION_PHRASE } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import { HARNESS_START, withAccountServer } from "./account-harness.js";

const MINUTE = 60 * 1000;

describe("POST /api/v1/me/delete", () =>
{
	it("deletes without a download: every store and the identity provider, and the same session is then 401", async () =>
	{
		await withAccountServer(async (h) =>
		{
			const token = await h.sessionFor("fan-1");
			// A second provider's link: the dev admin must not be asked to delete it.
			await h.ctx.auth.users.linkIdentity("logto", "logto-fan-1", "fan-1");
			const other = await h.sessionFor("fan-2");

			const res = await h.post("/api/v1/me/delete", {
				phrase: ACCOUNT_DELETION_PHRASE,
			}, token);
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({
				deleted: true,
			});

			expect(await h.account.downloads.exportFor("fan-1")).toBeNull();
			expect(h.account.identityAdmins[0].deleted).toEqual(["fan-1"]);
			expect((await h.get("/api/v1/me", token)).status).toBe(401);
			for (const store of h.account.stores) expect(await store.exportFor("fan-1")).toBeNull();
			expect(await h.ctx.auth.users.getByIdentity("logto", "logto-fan-1")).toBeNull();
			expect(await h.account.deletionLog.list()).toEqual([{
				uid: "fan-1",
				deletedAt: HARNESS_START.toISOString(),
			}]);
			// Another user is untouched.
			expect((await h.get("/api/v1/me", other)).status).toBe(200);
		});
	});

	it("deletes the account's stored downloads and download emails with it, and leaves another user's", async () =>
	{
		await withAccountServer(async (h) =>
		{
			const token = await h.sessionFor("fan-1");
			const other = await h.sessionFor("fan-2");
			expect((await h.post("/api/v1/me/download", {}, token)).status).toBe(200);
			expect((await h.post("/api/v1/me/download", {}, other)).status).toBe(200);
			const kept = await h.account.downloads.exportFor("fan-2");

			expect((await h.post("/api/v1/me/delete", {
				phrase: ACCOUNT_DELETION_PHRASE,
			}, token)).status).toBe(200);

			expect(await h.account.downloads.exportFor("fan-1")).toBeNull();
			expect(h.account.mailer.sent.map((m) => m.uid)).toEqual(["fan-2"]);
			expect(await h.account.downloads.exportFor("fan-2")).toEqual(kept);
			expect((await h.get("/api/v1/me/download", other)).status).toBe(200);
		});
	});

	describe("refuses", () =>
	{
		it("a sign-in older than 10 minutes (403 reauth_required)", async () =>
		{
			await withAccountServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				h.advance(10 * MINUTE + 1000);
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE,
				}, token);
				expect(res.status).toBe(403);
				expect(await res.json()).toEqual({
					error: "reauth_required",
				});
				expect(await h.ctx.auth.users.getByUid("fan-1")).not.toBeNull();
			});
		});

		it("a wrong phrase (400 phrase_mismatch), even one differing only in case", async () =>
		{
			await withAccountServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				const res = await h.post("/api/v1/me/delete", {
					phrase: ACCOUNT_DELETION_PHRASE.toUpperCase(),
				}, token);
				expect(res.status).toBe(400);
				expect(await res.json()).toEqual({
					error: "phrase_mismatch",
				});
				expect(await h.ctx.auth.users.getByUid("fan-1")).not.toBeNull();
			});
		});

		it("a body that isn't { phrase } (400), and no session (401)", async () =>
		{
			await withAccountServer(async (h) =>
			{
				const token = await h.sessionFor("fan-1");
				expect((await h.post("/api/v1/me/delete", "not json", token)).status).toBe(400);
				expect((await h.post("/api/v1/me/delete", {
					phrase: 42,
				}, token)).status).toBe(400);
				expect((await h.post("/api/v1/me/delete", {})).status).toBe(401);
			});
		});
	});
});

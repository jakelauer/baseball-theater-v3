/**
 * The deletion service itself (S77, ADR-028): a store that fails partway leaves
 * the deletion retryable with the same session and token, and the deletion log
 * re-applies to data a restored backup brings back.
 */
import type { BtSession, UserProfile } from "@bt/domain";
import { ACCOUNT_DELETION_PHRASE, entitlementsForTier } from "@bt/domain";
import type { PersonalDataStore } from "@bt/ports";
import {
	describe, expect, it,
} from "vitest";
import { createDevAccountData } from "../adapters/fixtures/auth.js";
import { InMemoryUserRepository } from "../adapters/memory/repos.js";
import {
	deleteAccount, exportAccount, reapplyDeletions,
} from "./account-deletion.js";

function user(uid: string): UserProfile
{
	return {
		uid,
		email: `${uid}@example.test`,
		displayName: uid,
		patreonUserId: null,
		role: "member",
		entitlements: entitlementsForTier("none"),
		favoriteTeamIds: [],
		createdAt: "2026-10-24T00:00:00.000Z",
		updatedAt: "2026-10-24T00:00:00.000Z",
	};
}

/** A session issued just now, so the recent-sign-in check passes. */
function sessionOf(uid: string): BtSession
{
	const issuedAt = Math.floor(Date.now() / 1000);
	return {
		uid,
		role: "member",
		entitlements: entitlementsForTier("none"),
		issuedAt,
		expiresAt: issuedAt + 3600,
	};
}

async function seeded()
{
	const users = new InMemoryUserRepository();
	for (const uid of ["fan-1", "fan-2"])
	{
		await users.upsert(user(uid));
		await users.linkIdentity("dev", uid, uid);
	}
	return {
		users,
		deps: createDevAccountData(users),
	};
}

describe("deleteAccount", () =>
{
	it("a retry finishes a deletion that failed when a store threw once, with the same session and token", async () =>
	{
		const { users, deps } = await seeded();
		let failures = 1;
		const flaky: PersonalDataStore = {
			name: "Flaky store",
			exportFor: async () => null,
			deleteFor: async () =>
			{
				if (failures-- > 0) throw new Error("store unavailable");
			},
		};
		deps.stores = [...deps.stores, flaky];
		const session = sessionOf("fan-1");
		const { deletionToken } = await exportAccount(deps, "fan-1");
		const request = {
			phrase: ACCOUNT_DELETION_PHRASE,
			deletionToken,
		};

		await expect(deleteAccount(deps, session, request)).rejects.toThrow("store unavailable");
		// Nothing that authorizes the retry is gone: the account and its links remain, the token is unused, nothing is logged.
		expect(await users.getByUid("fan-1")).not.toBeNull();
		expect(await deps.deletionLog.list()).toEqual([]);

		expect(await deleteAccount(deps, session, request)).toBeNull();
		expect(await users.exportFor("fan-1")).toBeNull();
		expect(await users.getByUid("fan-2")).not.toBeNull();
		expect((await deps.deletionLog.list()).map((e) => e.uid)).toEqual(["fan-1"]);
	});
});

describe("reapplyDeletions", () =>
{
	it("reapplyDeletions deletes a uid a restored backup brought back, and the log keeps only uid and time", async () =>
	{
		const { users, deps } = await seeded();
		const { deletionToken } = await exportAccount(deps, "fan-1");
		expect(await deleteAccount(deps, sessionOf("fan-1"), {
			phrase: ACCOUNT_DELETION_PHRASE,
			deletionToken,
		})).toBeNull();

		const log = await deps.deletionLog.list();
		expect(log).toHaveLength(1);
		expect(Object.keys(log[0]!).sort()).toEqual(["deletedAt", "uid"]);

		// A backup from before the deletion is restored.
		await users.upsert(user("fan-1"));
		await users.linkIdentity("dev", "fan-1", "fan-1");
		expect(await reapplyDeletions(deps)).toBe(1);
		expect(await users.exportFor("fan-1")).toBeNull();
		expect(await users.getByUid("fan-2")).not.toBeNull();
	});
});

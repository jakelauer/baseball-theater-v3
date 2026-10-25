import type { UserProfile } from "@bt/domain";
import { entitlementsForTier } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import { InMemoryUserRepository } from "../adapters/memory/repos.js";
import { personalDataStores, USERS_STORE } from "./personal-data.js";

const user: UserProfile = {
	uid: "uid-1",
	email: "fan@example.test",
	displayName: "Fan",
	patreonUserId: null,
	role: "member",
	entitlements: entitlementsForTier("none"),
	favoriteTeamIds: [147],
	createdAt: "2026-10-24T00:00:00.000Z",
	updatedAt: "2026-10-24T00:00:00.000Z",
};

describe("personal data registry", () =>
{
	it("registers the in-memory user repository (profile and identity links) as one store", async () =>
	{
		const users = new InMemoryUserRepository();
		await users.upsert(user);
		await users.linkIdentity("dev", "uid-1", "uid-1");

		const stores = personalDataStores({
			users,
		});
		expect(stores.map((s) => s.name)).toEqual([USERS_STORE]);

		const [store] = stores;
		expect(await store!.exportFor("uid-1")).toEqual({
			profile: user,
			identities: [{
				provider: "dev",
				subject: "uid-1",
			}],
		});
		await store!.deleteFor("uid-1");
		expect(await users.getByUid("uid-1")).toBeNull();
		expect(await users.getByIdentity("dev", "uid-1")).toBeNull();
		expect(await store!.exportFor("uid-1")).toBeNull();
	});
});

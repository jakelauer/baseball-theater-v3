/**
 * The one storage contract every repository adapter is held to (ADR-018, S46;
 * the cases S9 wrote for Firestore, carried over). The in-memory test doubles
 * run it today; the Postgres adapter (S50) joins by calling the same function,
 * so the two can't drift.
 *
 * A subject describes how to build a value for a key at a version. Values must
 * differ in content between versions, so "replaced" and "kept" are observable.
 * Case (d) runs only for ports that list by date (`listByDate`); the others
 * have no such read.
 */
import {
	beforeEach, describe, expect, it,
} from "vitest";

/** The reads and writes every keyed repository shares. */
export interface ContractRepository<K, T>
{
	upsert(value: T): Promise<void>;
	get(key: K): Promise<T | null>;
	listByDate?(date: string): Promise<T[]>;
}

export interface ContractSubject<K, T>
{
	/** A fresh repository over empty storage. */
	create(): ContractRepository<K, T>;
	/** A value for `key` at `version`, whose content depends on the version. Dated on `date` when given. */
	make(key: K, version: number, date?: string): Promise<T>;
	keyOf(value: T): K;
	/** Two keys that `make` accepts, and one that is never written. */
	keys: [K, K];
	missingKey: K;
	/** Mutate a value in place (to prove reads hand back copies). */
	mutate(value: T): void;
}

/** What Postgres `jsonb` hands back for a written value. */
function asJson<T>(value: T): T
{
	return JSON.parse(JSON.stringify(value)) as T;
}

export function describeRepositoryContract<K, T>(label: string, subject: ContractSubject<K, T>): void
{
	describe(`${label} — repository contract`, () =>
	{
		let repo: ContractRepository<K, T>;
		const [k1, k2] = subject.keys;

		beforeEach(() =>
		{
			repo = subject.create();
		});

		it("(a) a read deep-equals the JSON of what was stored and is not the same object", async () =>
		{
			const written = await subject.make(k1, 1);
			await repo.upsert(written);
			const read = await repo.get(k1);
			expect(read).toEqual(asJson(written));
			expect(read).not.toBe(written);
		});

		it("(b) reads null for a missing key", async () =>
		{
			expect(await repo.get(subject.missingKey)).toBeNull();
		});

		it("(c) an upsert with a newer version replaces the stored value", async () =>
		{
			await repo.upsert(await subject.make(k1, 1));
			const newer = await subject.make(k1, 2);
			await repo.upsert(newer);
			expect(await repo.get(k1)).toEqual(asJson(newer));
		});

		if (subject.create().listByDate)
		{
			it("(d) listByDate returns exactly that date's entries, and [] for a date with none", async () =>
			{
				await repo.upsert(await subject.make(k1, 1, "2024-07-04"));
				await repo.upsert(await subject.make(k2, 1, "2024-07-05"));
				const listed = await repo.listByDate!("2024-07-04");
				expect(listed.map((v) => subject.keyOf(v))).toEqual([k1]);
				expect(await repo.listByDate!("1999-01-01")).toEqual([]);
			});
		}

		it("(e) mutating a written or a returned value does not change the store", async () =>
		{
			const written = await subject.make(k1, 1);
			const expected = asJson(written);
			await repo.upsert(written);
			subject.mutate(written);
			const read = await repo.get(k1);
			subject.mutate(read!);
			expect(await repo.get(k1)).toEqual(expected);
		});

		it("(f) an upsert whose version is not newer than the stored one is a no-op", async () =>
		{
			const held = await subject.make(k1, 2);
			await repo.upsert(held);
			await repo.upsert(await subject.make(k1, 1));
			const sameVersion = await subject.make(k1, 2);
			subject.mutate(sameVersion);
			await repo.upsert(sameVersion);
			expect(await repo.get(k1)).toEqual(asJson(held));
		});
	});
}

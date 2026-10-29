/**
 * Law P10 (docs/v3/LAWS.md; owner, 2026-10-29: "Yes, add it with S87"): BT sets cookies
 * from one codepath only, `functions/src/services/cookies.ts`. Two halves: no other
 * source file writes `Set-Cookie`, and walking every route in the route table — signed
 * in, signed out, and carrying the deletion cookie — no response sets a cookie whose
 * name that module doesn't declare.
 */
import {
	readdirSync, readFileSync, statSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ACCOUNT_DELETION_PHRASE } from "@bt/domain";
import {
	describe, expect, it,
} from "vitest";
import {
	BT_COOKIE_NAMES, DELETED_COOKIE, DELETED_COOKIE_VALUE,
} from "../services/cookies.js";
import { withAccountServer } from "./account-harness.js";
import { API_ROUTER, handleApiRequest } from "./api.js";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[]
{
	return readdirSync(dir).flatMap((name) =>
	{
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
	});
}

/** The names of the cookies a set of `Set-Cookie` values sets. */
export function cookieNames(setCookies: string[]): string[]
{
	return setCookies.map((c) => c.split("=")[0]!.trim());
}

describe("law P10: cookies come from one codepath", () =>
{
	it("no source file other than services/cookies.ts writes Set-Cookie", () =>
	{
		const writers = sourceFiles(SRC)
			.filter((f) => /set-cookie/i.test(readFileSync(f, "utf8")))
			.map((f) => relative(SRC, f));
		expect(writers).toEqual(["services/cookies.ts"]);
	});

	it("every route, signed in or out and with the deletion cookie, sets only cookies cookies.ts declares", async () =>
	{
		await withAccountServer(async (h) =>
		{
			const token = await h.sessionFor("fan-1");
			const seen: string[] = [];
			for (const { route } of API_ROUTER)
			{
				const [method, pattern] = route.split(" ") as [string, string];
				const path = pattern.replace(/:gamePk/, "745001").replace(/:downloadId/, "none").replace(/:[a-zA-Z]+/g, "x");
				for (const auth of [token, undefined])
				{
					const headers = new Headers({
						Cookie: `${DELETED_COOKIE}=${DELETED_COOKIE_VALUE}`,
						"Content-Type": "application/json",
					});
					if (auth) headers.set("Authorization", `Bearer ${auth}`);
					const body = method === "GET" ? undefined : JSON.stringify(route.endsWith("/delete") ? {
						phrase: "not the phrase",
					} : {});
					const res = await handleApiRequest(new Request(`http://localhost:8787${path}`, {
						method,
						headers,
						body,
					}), h.ctx);
					seen.push(...cookieNames(res.headers.getSetCookie()));
				}
			}
			// The deletion path itself, which really sets the cookie.
			const deleted = await handleApiRequest(new Request("http://localhost:8787/api/v1/me/delete", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phrase: ACCOUNT_DELETION_PHRASE,
				}),
			}), h.ctx);
			seen.push(...cookieNames(deleted.headers.getSetCookie()));

			expect(seen.length).toBeGreaterThan(0);
			expect(seen.filter((name) => !BT_COOKIE_NAMES.has(name))).toEqual([]);
		});
	});

	it("the check catches a cookie cookies.ts doesn't declare", () =>
	{
		expect(cookieNames(["tracker=abc; Path=/"]).filter((name) => !BT_COOKIE_NAMES.has(name))).toEqual(["tracker"]);
	});
});

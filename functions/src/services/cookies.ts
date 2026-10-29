/**
 * Every cookie BT sets goes through this module (law P10 in docs/v3/LAWS.md; owner,
 * 2026-10-29: "Yes, add it with S87"; `functions/src/handlers/cookie-law.test.ts`
 * fails on any other). Today there is one: the deletion cookie.
 *
 * The deletion cookie (S87, standings-search-settings A5): a successful account
 * deletion sets it so the next visit to Settings can say the account is gone —
 * "triggered by visiting the settings page with a server-only cookie that is only
 * sent to users after deletion" (owner, 2026-10-29), shown "Until seen once". It is
 * `HttpOnly` (the page's code never reads it; `/api/v1/me` reports it), `SameSite=Strict`,
 * a browser-session cookie (no lifetime), and `Secure` over HTTPS only (owner,
 * 2026-10-29: "Secure on HTTPS only" — Safari drops `Secure` cookies on
 * `http://localhost`). Its value is a fixed marker: it names no uid or email (ADR-028).
 */

/** The deletion cookie's name. */
export const DELETED_COOKIE = "bt_account_deleted";

/** Its value: a marker, never anything that identifies the person (ADR-028). */
export const DELETED_COOKIE_VALUE = "1";

/** Every cookie name BT may set (law P10). */
export const BT_COOKIE_NAMES: ReadonlySet<string> = new Set([DELETED_COOKIE]);

function attributes(request: Request): string
{
	const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
	return `; HttpOnly; SameSite=Strict; Path=/${secure}`;
}

/** Whether `request` carries the deletion cookie. */
export function hasDeletedCookie(request: Request): boolean
{
	return (request.headers.get("Cookie") ?? "")
		.split(";")
		.some((part) => part.trim() === `${DELETED_COOKIE}=${DELETED_COOKIE_VALUE}`);
}

/** Marks `response` (a successful deletion's) with the deletion cookie. */
export function setDeletedCookie(response: Response, request: Request): Response
{
	response.headers.append("Set-Cookie", `${DELETED_COOKIE}=${DELETED_COOKIE_VALUE}${attributes(request)}`);
	return response;
}

/** Tells the browser to drop the deletion cookie (seen once: "Until seen once"). */
export function clearDeletedCookie(response: Response, request: Request): Response
{
	response.headers.append("Set-Cookie", `${DELETED_COOKIE}=; Max-Age=0${attributes(request)}`);
	return response;
}

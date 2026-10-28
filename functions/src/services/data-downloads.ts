/**
 * Data downloads (ADR-028, owner 2026-10-27): separate from deletion. A request
 * walks every registered personal data store, keeps the result as a stored file
 * that ages out after 14 days, and emails the account a link to BT (never the
 * data). At most two requests in any rolling 24 hours; the rules themselves are
 * `@bt/domain`'s `downloads.ts`, so this only applies them.
 *
 * In memory the file is made at once; with R2 it may move to the background
 * (S80's out-of-scope note), which changes when the file exists, not these rules.
 */
import type {
	MeDownloadFileResponse, MeDownloadResponse, UserProfile,
} from "@bt/domain";
import { downloadExpiresAt, nextDownloadAllowedAt } from "@bt/domain";
import type { DataDownload } from "@bt/ports";
import type { AccountDataDeps } from "./account-deletion.js";

/** The secret the app's public origin is read from, for links in email (a Worker variable in production). */
export const APP_ORIGIN_SECRET = "BT_APP_ORIGIN";

/** The web app's origin under `pnpm dev` (Vite on :5173; the API is a separate origin on :8787). */
export const DEFAULT_APP_ORIGIN = "http://localhost:5173";

/** A download request's outcome: the stored download, or the time the next one is allowed. */
export type DownloadRequestResult =
	| { download: MeDownloadResponse }
	| { nextAllowedAt: string };

function toResponse(download: DataDownload): MeDownloadResponse
{
	return {
		id: download.id,
		expiresAt: download.expiresAt,
	};
}

/**
 * The download-ready email: a link to Settings (`/settings`, signed-in only),
 * where the download is listed. It names no data and no download id, so the
 * message is useless to anyone who isn't signed in as its owner.
 */
async function sendDownloadReady(deps: AccountDataDeps, user: UserProfile, expiresAt: string): Promise<void>
{
	if (user.email === null) return;
	const origin = await deps.secrets.get(APP_ORIGIN_SECRET) ?? DEFAULT_APP_ORIGIN;
	await deps.mailer.send({
		uid: user.uid,
		to: user.email,
		subject: "Your Baseball Theater data download is ready",
		text: `Your data download is ready. Sign in and open ${origin}/settings to get it. It is available until ${expiresAt}.`,
	});
}

/**
 * Makes `user` a download, or refuses with the next allowed time when two were
 * requested in the last 24 hours. Sends the email only after the file is stored.
 */
export async function requestDownload(deps: AccountDataDeps, user: UserProfile): Promise<DownloadRequestResult>
{
	const now = deps.now?.() ?? new Date();
	const earlier = await deps.downloads.list(user.uid, now);
	const nextAllowedAt = nextDownloadAllowedAt(earlier.map((d) => d.createdAt), now);
	if (nextAllowedAt) return {
		nextAllowedAt,
	};

	const stores: Record<string, unknown> = {};
	for (const store of deps.stores) stores[store.name] = await store.exportFor(user.uid);
	const download: DataDownload = {
		id: crypto.randomUUID(),
		uid: user.uid,
		createdAt: now.toISOString(),
		expiresAt: downloadExpiresAt(now),
	};
	await deps.downloads.put(download, stores);
	await sendDownloadReady(deps, user, download.expiresAt);
	return {
		download: toResponse(download),
	};
}

/** The user's newest download that hasn't aged out, or null. */
export async function currentDownload(deps: AccountDataDeps, uid: string): Promise<MeDownloadResponse | null>
{
	const downloads = await deps.downloads.list(uid, deps.now?.() ?? new Date());
	const newest = downloads.at(-1);
	return newest ? toResponse(newest) : null;
}

/** Download `id`'s file when it is `uid`'s and hasn't aged out, else null (the route answers 404 either way). */
export async function downloadFile(deps: AccountDataDeps, uid: string, id: string): Promise<MeDownloadFileResponse | null>
{
	const now = deps.now?.() ?? new Date();
	const record = (await deps.downloads.list(uid, now)).find((d) => d.id === id);
	const file = record ? await deps.downloads.file(uid, id, now) : null;
	return record && file !== null ? {
		...toResponse(record),
		stores: file as Record<string, unknown>,
	} : null;
}

/**
 * The typed BT API route contract (ADR-014 "the wire boundary").
 *
 * One runtime-enumerable table maps each route to its response type (and, in
 * `ApiRequestBodies`, the routes that take a body to its type). Both the
 * server's sender (`functions/src/handlers/api.ts`) and the client's fetch
 * helper (`web/src/api/client.ts`) consume this same declaration — a route and
 * its response cannot disagree without breaking a typecheck on one end or the
 * other.
 *
 * Response types are named `<DomainType>Response` aliases (ADR-014 "Response
 * aliases — the DTO seam"), not the bare domain type. Each alias is *derived*
 * (`type XResponse = X`) — structurally identical to its source today, so this
 * is not a second, hand-authored shape and does not reopen the "one type
 * source" drift risk. It plants a named seam: the day an internal-only reason
 * forces a domain field to change while the wire needs to stay stable, that
 * divergence lives in the matching `to<DomainType>Response` mapping function
 * (still a passthrough today), not in a rewrite of the route table.
 */
import type { AccountSettings } from "./settings.js";
import type {
	Entitlements, GameSnapshot, Role, ScheduleDay, UserProfile,
} from "./types.js";

export type ScheduleDayResponse = ScheduleDay;
export type GameSnapshotResponse = GameSnapshot;

/**
 * The signed-in account, for Settings' "Signed in as {email}" (standings-search-settings
 * A3) and for gating UI by entitlement. A projection of `UserProfile`, not the
 * whole record: Patreon IDs and timestamps stay server-side.
 */
export interface MeResponse {
	uid: string;
	email: string | null;
	role: Role;
	entitlements: Entitlements;
}

/**
 * A signed-in user's data download (ADR-028): every registered personal data
 * store's export, keyed by its inventory name, plus the single-use token that
 * proves this download happened before a deletion is allowed.
 */
export interface MeExportResponse {
	/** Store name (ADR-028's inventory **Where**) → that store's export; null when it holds nothing. */
	stores: Record<string, unknown>;
	/** Single-use, bound to this user, sent back as {@link MeDeleteRequest.deletionToken}. */
	deletionToken: string;
	/** ISO time the token stops working (at most 15 minutes after the export). */
	deletionTokenExpiresAt: string;
}

/**
 * The body of an account deletion: the phrase the user typed, which must equal
 * {@link ACCOUNT_DELETION_PHRASE} exactly, and the token from their export.
 */
export interface MeDeleteRequest {
	phrase: string;
	deletionToken: string;
}

/** A finished deletion. The session that asked no longer resolves to an account. */
export interface MeDeleteResponse {
	deleted: true;
}

/**
 * What a user types to confirm deleting their account (ADR-028: "maximal
 * verification including typing a phrase"). One constant, so S79's
 * confirmation field compares against the same text the server checks.
 */
export const ACCOUNT_DELETION_PHRASE = "delete my account";

/** The signed-in user's settings document (ADR-027); the house defaults until they first save. */
export type SettingsResponse = AccountSettings;

/** A settings write: the whole document with a bumped `version`; an older version is ignored (ADR-022). */
export type SettingsRequest = AccountSettings;

/** The one error-body shape every 4xx path returns. */
export interface ApiErrorResponse {
	error: string;
	hint?: string;
}

/** Passthrough today — see the module doc for why this indirection exists. */
export function toScheduleDayResponse(day: ScheduleDay): ScheduleDayResponse
{
	return day;
}

/** Passthrough today — see the module doc for why this indirection exists. */
export function toGameSnapshotResponse(game: GameSnapshot): GameSnapshotResponse
{
	return game;
}

/** Picks the wire fields from a stored user; everything else on `UserProfile` stays server-side. */
export function toMeResponse(user: UserProfile): MeResponse
{
	return {
		uid: user.uid,
		email: user.email,
		role: user.role,
		entitlements: user.entitlements,
	};
}

/** Registry a route's response-type name is checked against — no unenforced string keys. */
export interface ApiResponseTypes {
	ScheduleDayResponse: ScheduleDayResponse;
	GameSnapshotResponse: GameSnapshotResponse;
	MeResponse: MeResponse;
	MeExportResponse: MeExportResponse;
	MeDeleteResponse: MeDeleteResponse;
	SettingsResponse: SettingsResponse;
	ApiErrorResponse: ApiErrorResponse;
}

/**
 * `"<METHOD> <path>"` → the name of its response type in {@link ApiResponseTypes}.
 * A runtime value (not just a type), so S27 can walk it to generate a spec.
 * `satisfies` makes an unknown type-name key a compile error.
 */
export const ApiRoutes = {
	"GET /api/v1/schedule": "ScheduleDayResponse",
	"GET /api/v1/games/:gamePk": "GameSnapshotResponse",
	"GET /api/v1/me": "MeResponse",
	"GET /api/v1/me/export": "MeExportResponse",
	"POST /api/v1/me/delete": "MeDeleteResponse",
	"GET /api/v1/me/settings": "SettingsResponse",
	"PUT /api/v1/me/settings": "SettingsResponse",
} as const satisfies Record<string, keyof ApiResponseTypes>;

export type ApiRoute = keyof typeof ApiRoutes;

/** The response type a given route resolves to, via the registry above. */
export type ApiResponseFor<R extends ApiRoute> = ApiResponseTypes[(typeof ApiRoutes)[R]];

/** Registry a route's request-body type name is checked against, like {@link ApiResponseTypes}. */
export interface ApiRequestTypes {
	MeDeleteRequest: MeDeleteRequest;
	SettingsRequest: SettingsRequest;
}

/**
 * The routes that take a JSON request body → its type's name in
 * {@link ApiRequestTypes} (S77; S6's settings write reuses it). A runtime value
 * so the spec generator can emit each `requestBody`; a route absent here takes none.
 */
export const ApiRequestBodies = {
	"POST /api/v1/me/delete": "MeDeleteRequest",
	"PUT /api/v1/me/settings": "SettingsRequest",
} as const satisfies Partial<Record<ApiRoute, keyof ApiRequestTypes>>;

export type ApiRouteWithBody = keyof typeof ApiRequestBodies;

/** The request-body type a route takes, via the registry above. */
export type ApiRequestFor<R extends ApiRouteWithBody> = ApiRequestTypes[(typeof ApiRequestBodies)[R]];

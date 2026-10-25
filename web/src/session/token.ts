/**
 * The bearer token the API client sends (S59). It's the one piece of session
 * state the API layer needs, kept outside React so `client.ts`'s middleware can
 * read it on every request without importing the session provider.
 *
 * Persisted through `web/src/storage/` (ADR-028) so a reload stays signed in;
 * that module labels it personal, so sign-out's `clearPersonalData()` removes
 * it too. Unavailable storage just means being signed out after a reload.
 */
import { readStored, writeStored } from "../storage/storage.js";

let current: string | null | undefined;

export function getSessionToken(): string | null
{
	if (current === undefined) current = readStored("bt.session");
	return current;
}

export function setSessionToken(token: string | null): void
{
	current = token;
	writeStored("bt.session", token);
}

/**
 * The bearer token the API client sends (S59). It's the one piece of session
 * state the API layer needs, kept outside React so `client.ts`'s middleware can
 * read it on every request without importing the session provider.
 *
 * Kept in `localStorage` so a reload stays signed in. Storage can be missing or
 * throw (private windows, blocked site data), so every access is guarded: the
 * worst case is being signed out after a reload.
 */
const STORAGE_KEY = "bt.session";

let current: string | null | undefined;

export function getSessionToken(): string | null
{
	if (current === undefined)
	{
		try
		{
			current = localStorage.getItem(STORAGE_KEY);
		}
		catch
		{
			current = null;
		}
	}
	return current;
}

export function setSessionToken(token: string | null): void
{
	current = token;
	try
	{
		if (token === null) localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, token);
	}
	catch
	{
		// Unavailable storage: the token still lives for this page load.
	}
}

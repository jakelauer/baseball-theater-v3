/**
 * Who is using the app (S59). Session state lives in its own provider, not as
 * a TanStack query next to game data (ADR-014 rule 7). When it changes, it
 * invalidates the server data that depends on it.
 *
 * The session is the account `GET /api/v1/me` returns for the stored bearer
 * token (`token.ts`). The server answers 401 when there is no valid session,
 * which reads as signed out.
 */
import { useQueryClient } from "@tanstack/react-query";
import {
	useEffect, useState, type ReactNode,
} from "react";
import { fetchMe } from "../api/client.js";
import {
	ACCOUNT_QUERY_KEY, DEV_SIGN_IN_TOKEN, SessionContext, SIGNED_OUT, type Session, type SessionState,
} from "./session.js";
import { getSessionToken, setSessionToken } from "./token.js";

/**
 * Reads the account for the stored token. A 401 drops the token. If the server
 * can't be reached, this load counts as signed out but the token is kept, so
 * the next load can try again.
 */
async function loadSession(): Promise<SessionState>
{
	try
	{
		const account = await fetchMe();
		if (!account)
		{
			setSessionToken(null);
			return SIGNED_OUT;
		}
		return {
			status: "signedIn",
			account,
		};
	}
	catch
	{
		return SIGNED_OUT;
	}
}

export function SessionProvider({ children }: { children: ReactNode })
{
	const queryClient = useQueryClient();
	// With no stored token there is nothing to ask the server, so start signed out.
	const [state, setState] = useState<SessionState>(() => (getSessionToken() ? {
		status: "loading",
	} : SIGNED_OUT));

	useEffect(() =>
	{
		if (!getSessionToken()) return;
		let current = true;
		void loadSession().then((next) =>
		{
			if (current) setState(next);
		});
		return () =>
		{
			current = false;
		};
	}, []);

	const session: Session = {
		...state,
		async signIn()
		{
			if (import.meta.env.PROD) return;
			setSessionToken(DEV_SIGN_IN_TOKEN);
			setState(await loadSession());
			await queryClient.invalidateQueries({
				queryKey: ACCOUNT_QUERY_KEY,
			});
		},
		signOut()
		{
			setSessionToken(null);
			setState(SIGNED_OUT);
			queryClient.removeQueries({
				queryKey: ACCOUNT_QUERY_KEY,
			});
		},
	};

	return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

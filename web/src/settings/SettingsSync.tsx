import { useEffect } from "react";
import { useSession } from "../session/session.js";
import { hydrateSettings, resetSettings } from "./store.js";

/**
 * Ties the settings store to the session (ADR-027): signed in, it reads the
 * account's settings; signed out, it puts the house defaults back. Renders
 * nothing; mounted once inside `SessionProvider`.
 */
export function SettingsSync(): null
{
	const { status } = useSession();
	useEffect(() =>
	{
		if (status === "signedIn") hydrateSettings().catch(() => undefined);
		if (status === "signedOut") resetSettings();
	}, [status]);
	return null;
}

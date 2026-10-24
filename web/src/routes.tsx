import type { ReactNode } from "react";
import {
	Navigate, Route, Routes,
} from "react-router-dom";
import { GamePage } from "./pages/GamePage.js";
import { ScoreboardPage } from "./pages/ScoreboardPage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { StandingsPage } from "./pages/StandingsPage.js";
import { useSession } from "./session/session.js";

/**
 * Settings are signed-in only (ADR-027). Signed out, the route sends you to
 * the scoreboard. While the session is still loading it renders nothing, so a
 * signed-in reload isn't bounced away before the session arrives.
 */
function SignedInOnly({ children }: { children: ReactNode })
{
	const session = useSession();
	if (session.status === "loading") return null;
	if (session.status === "signedOut") return <Navigate to="/games" replace />;
	return children;
}

export function AppRoutes()
{
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/games/2024-07-04" replace />} />
			<Route path="/games" element={<Navigate to="/games/2024-07-04" replace />} />
			<Route path="/games/:date" element={<ScoreboardPage />} />
			<Route path="/game/:gamePk" element={<GamePage />} />
			<Route path="/game/:gamePk/:tab" element={<GamePage />} />
			<Route path="/standings" element={<StandingsPage />} />
			<Route path="/search" element={<SearchPage />} />
			<Route path="/settings" element={<SignedInOnly><SettingsPage /></SignedInOnly>} />
		</Routes>
	);
}

import type { ReactNode } from "react";
import {
	Navigate, Route, Routes,
} from "react-router-dom";
import { GamePage } from "./pages/GamePage.js";
import { ScoreboardPage } from "./pages/ScoreboardPage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { StandingsPage } from "./pages/StandingsPage.js";
import type { LayoutVariant } from "./layout/variant.js";
import { useAccountDeleted } from "./api/accountDeleted.js";
import { DeletedAccountPage } from "./pages/settings/DeletedAccountPage.js";
import { useSession } from "./session/session.js";

/**
 * Signed out on `/settings`: if this browser's account was just deleted, A5's
 * page, once; otherwise off to the scoreboard. The server alone knows (S87's
 * `HttpOnly` cookie), so the page stays empty while it is asked (S79).
 */
function SignedOutSettings()
{
	const { data: deleted, isPending } = useAccountDeleted();
	if (isPending) return null;
	return deleted ? <DeletedAccountPage /> : <Navigate to="/games" replace />;
}

/**
 * Settings are signed-in only (ADR-027). Signed out, the route shows the
 * deleted-account page once after a deletion and otherwise sends you to the
 * scoreboard. While the session is still loading it renders nothing, so a
 * signed-in reload isn't bounced away before the session arrives.
 */
function SignedInOnly({ children }: { children: ReactNode })
{
	const session = useSession();
	if (session.status === "loading") return null;
	if (session.status === "signedOut") return <SignedOutSettings />;
	return children;
}

/** The routes, each page given the pairing the layout host settled (S60). */
export function AppRoutes({ variant }: { variant: LayoutVariant })
{
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/games/2024-07-04" replace />} />
			<Route path="/games" element={<Navigate to="/games/2024-07-04" replace />} />
			<Route path="/games/:date" element={<ScoreboardPage variant={variant} />} />
			<Route path="/game/:gamePk" element={<GamePage variant={variant} />} />
			<Route path="/game/:gamePk/:tab" element={<GamePage variant={variant} />} />
			<Route path="/standings" element={<StandingsPage />} />
			<Route path="/search" element={<SearchPage />} />
			<Route path="/settings" element={<SignedInOnly><SettingsPage variant={variant} /></SignedInOnly>} />
		</Routes>
	);
}

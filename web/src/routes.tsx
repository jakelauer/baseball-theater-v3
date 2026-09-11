import {
	Navigate, Route, Routes,
} from "react-router-dom";
import { GamePage } from "./pages/GamePage.js";
import { ScoreboardPage } from "./pages/ScoreboardPage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { StandingsPage } from "./pages/StandingsPage.js";

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
			<Route path="/settings" element={<SettingsPage />} />
		</Routes>
	);
}

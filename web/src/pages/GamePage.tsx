import {
	List, Stack, Tabs, Text,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../api/game.js";
import { GameTopBar } from "../components/game/GameTopBar.js";
import { LiveRoom } from "../components/game/LiveRoom.js";
import { PlaysPanel } from "../components/pitch/PlaysPanel.js";
import { ViewState } from "../components/ViewState.js";
import { FooterMeta } from "../layout/FooterMeta.js";
import type { LayoutVariant } from "../layout/variant.js";
import {
	gamePhase, openingRoom, roomsForPhase,
} from "@bt/domain";
import { roomLabel } from "../components/game/format.js";
import { useSettings } from "../settings/store.js";

/**
 * One game: the game top bar (in place of the app header, S60), the room tabs
 * across the full width at every pairing (S56 game-rooms A2), and the room.
 * `variant` comes from the layout host; rooms take their tablet and desktop
 * layouts from it as they're built (S63/S64 and on).
 */
export function GamePage({ variant }: { variant: LayoutVariant })
{
	const { gamePk, tab } = useParams();
	const navigate = useNavigate();
	const {
		data: game, error, refetch,
	} = useGame(Number(gamePk));
	// Signed out, the store holds the house defaults, so games open on the default room.
	const { opensFirst } = useSettings();

	if (error)
	{
		return <ViewState kind="error" title="Couldn't load this room" onRetry={() => void refetch()} />;
	}
	if (!game)
	{
		return <ViewState kind="loading" />;
	}

	const phase = gamePhase(game.status.codedGameState);
	const rooms = roomsForPhase(phase);
	// With no room in the URL, the user's Opens First; a room this phase hides
	// (e.g. Live on a final game) opens the default room instead.
	const active = openingRoom(tab, opensFirst, phase);

	return (
		<Stack gap="xs" data-variant={variant}>
			<GameTopBar
				away={game.teams.away.abbreviation}
				home={game.teams.home.abbreviation}
				officialDate={game.officialDate}
				live={phase === "live"}
			/>

			<Tabs
				value={active}
				onChange={(value) =>
				{
					if (value)
					{
						void navigate(`/game/${game.gamePk}/${value}`);
					}
				}}
			>
				<Tabs.List
					justify="space-between"
					style={{
						flexWrap: "nowrap",
						overflowX: "auto",
					}}
				>
					{rooms.map((room) => (
						<Tabs.Tab key={room} value={room}>
							{roomLabel(room)}
						</Tabs.Tab>
					))}
				</Tabs.List>

				<Tabs.Panel value="videos" pt="md">
					{game.highlights.length === 0 ? (
						<ViewState kind="empty" message="No videos yet." />
					) : (
						<>
							<Text size="sm" c="dimmed" mb="sm">
								Impact-sorted (Phase A heuristic)
							</Text>
							<List spacing="sm">
								{game.highlights.map((h) => (
									<List.Item key={h.id}>
										<Text fw={600}>{h.title}</Text>
										{h.blurb ? (
											<Text size="sm" c="dimmed">
												{h.blurb}
											</Text>
										) : null}
									</List.Item>
								))}
							</List>
						</>
					)}
				</Tabs.Panel>

				{rooms.includes("live") ? (
					<Tabs.Panel value="live" pt="md">
						<LiveRoom game={game} />
					</Tabs.Panel>
				) : null}

				<Tabs.Panel value="plays" pt="md">
					<PlaysPanel plays={game.plays} />
				</Tabs.Panel>

				<Tabs.Panel value="box" pt="md">
					<ViewState kind="empty" message="No box score yet." />
				</Tabs.Panel>

				{rooms.includes("recap") ? (
					<Tabs.Panel value="recap" pt="md">
						<ViewState kind="empty" message="No recap yet." />
					</Tabs.Panel>
				) : null}
			</Tabs>
			<FooterMeta fetchedAt={game.fetchedAt} />
		</Stack>
	);
}

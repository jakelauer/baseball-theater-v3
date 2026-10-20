import {
	List, Stack, Tabs, Text,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../api/game.js";
import { GameTopBar } from "../components/game/GameTopBar.js";
import { LiveRoom } from "../components/game/LiveRoom.js";
import { PlaysPanel } from "../components/pitch/PlaysPanel.js";
import {
	RoomEmpty, RoomError, RoomLoading,
} from "../components/game/RoomState.js";
import {
	gamePhase, resolveRoom, roomsForPhase,
} from "@bt/domain";
import { roomLabel } from "../components/game/format.js";

export function GamePage()
{
	const { gamePk, tab } = useParams();
	const navigate = useNavigate();
	const {
		data: game, error, refetch,
	} = useGame(Number(gamePk));

	if (error)
	{
		return <RoomError onRetry={() => void refetch()} />;
	}
	if (!game)
	{
		return <RoomLoading />;
	}

	const phase = gamePhase(game.status.codedGameState);
	const rooms = roomsForPhase(phase);
	// A room this phase hides (e.g. /live on a final game) opens the default room instead.
	const active = resolveRoom(tab, phase);

	return (
		<Stack gap="xs">
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
				<Tabs.List style={{
					flexWrap: "nowrap",
					overflowX: "auto",
				}}>
					{rooms.map((room) => (
						<Tabs.Tab key={room} value={room}>
							{roomLabel(room)}
						</Tabs.Tab>
					))}
				</Tabs.List>

				<Tabs.Panel value="videos" pt="md">
					{game.highlights.length === 0 ? (
						<RoomEmpty message="No videos yet." />
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
					<RoomEmpty message="No box score yet." />
				</Tabs.Panel>

				{rooms.includes("recap") ? (
					<Tabs.Panel value="recap" pt="md">
						<RoomEmpty message="No recap yet." />
					</Tabs.Panel>
				) : null}
			</Tabs>
		</Stack>
	);
}

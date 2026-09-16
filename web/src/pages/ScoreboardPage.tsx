import {
	Badge,
	Card,
	Group,
	Loader,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import type { ScheduleGameSummary } from "@bt/domain";
import { useScheduleDay } from "../api/schedule.js";

function scoreLine(game: ScheduleGameSummary): string
{
	const away = game.linescore?.teams.away.runs ?? "-";
	const home = game.linescore?.teams.home.runs ?? "-";
	return `${away} – ${home}`;
}

export function ScoreboardPage()
{
	const { date = "2024-07-04" } = useParams();
	const { data: day, error } = useScheduleDay(date);

	if (error)
	{
		return (
			<Stack>
				<Title order={2}>Scoreboard</Title>
				<Text c="red">{error.message}</Text>
				<Text c="dimmed" size="sm">
					Start the local API with `pnpm dev` (runs API on :8787).
				</Text>
			</Stack>
		);
	}

	if (!day)
	{
		return (
			<Group justify="center" py="xl">
				<Loader />
			</Group>
		);
	}

	return (
		<Stack gap="lg">
			<div>
				<Title order={2}>Scoreboard</Title>
				<Text c="dimmed">
					{day.date} · {day.windowMode} · fetched{" "}
					{new Date(day.fetchedAt).toLocaleString()}
				</Text>
			</div>

			<SimpleGrid cols={{
				base: 1,
				sm: 2,
			}} spacing="md">
				{day.games.map((game) => (
					<Card
						key={game.gamePk}
						component={Link}
						to={`/game/${game.gamePk}`}
						padding="lg"
						radius="md"
						withBorder
						style={{
							background: "rgba(255,255,255,0.04)",
							borderColor: "rgba(232,226,214,0.12)",
							transition: "transform 160ms ease, border-color 160ms ease",
						}}
					>
						<Group justify="space-between" mb="xs">
							<Badge
								variant="light"
								color={game.status.codedGameState === "I" ? "green" : "gray"}
							>
								{game.status.detailedState}
							</Badge>
							<Text size="sm" c="dimmed">
								{game.venue?.name}
							</Text>
						</Group>
						<Title order={4}>
							{game.teams.away.abbreviation} @ {game.teams.home.abbreviation}
						</Title>
						<Text size="xl" fw={700} mt="xs">
							{scoreLine(game)}
						</Text>
						<Text size="sm" c="dimmed" mt="sm">
							{game.teams.away.name} at {game.teams.home.name}
						</Text>
					</Card>
				))}
			</SimpleGrid>
		</Stack>
	);
}

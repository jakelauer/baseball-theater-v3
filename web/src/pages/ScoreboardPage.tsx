import {
	Badge,
	Card,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import type { ScheduleGameSummary } from "@bt/domain";
import { gamePhase } from "@bt/domain";
import { useScheduleDay } from "../api/schedule.js";
import { ViewState } from "../components/ViewState.js";
import { FooterMeta } from "../layout/FooterMeta.js";
import type { LayoutVariant } from "../layout/variant.js";

function scoreLine(game: ScheduleGameSummary): string
{
	const away = game.linescore?.teams.away.runs ?? "-";
	const home = game.linescore?.teams.home.runs ?? "-";
	return `${away} – ${home}`;
}

/**
 * The day's games (pre-design cards until S65–S68 build the ratified modules):
 * one column on mobile, two on medium and desktop, from the host's `variant`.
 */
export function ScoreboardPage({ variant }: { variant: LayoutVariant })
{
	const { date = "2024-07-04" } = useParams();
	const {
		data: day, error, refetch,
	} = useScheduleDay(date);

	if (error)
	{
		return <ViewState kind="error" title="Couldn't load games" onRetry={() => void refetch()} />;
	}

	if (!day)
	{
		return <ViewState kind="loading" title="Scoreboard" />;
	}

	return (
		<Stack gap="lg">
			<div>
				<Title order={2}>Scoreboard</Title>
				<Text c="dimmed">
					{day.date} · {day.windowMode}
				</Text>
			</div>

			<SimpleGrid cols={variant === "mobile" ? 1 : 2} spacing="md">
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
								color={gamePhase(game.status.codedGameState) === "live" ? "green" : "gray"}
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
			<FooterMeta fetchedAt={day.fetchedAt} />
		</Stack>
	);
}

import {
	Badge, Group, List, Loader, Stack, Tabs, Text, Title,
} from "@mantine/core";
import {
	Link, useNavigate, useParams,
} from "react-router-dom";
import { useGame } from "../api/game.js";
import { PlaysPanel } from "../components/pitch/PlaysPanel.js";

const TABS = ["videos", "live", "plays", "box", "recap"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab
{
	return !!value && (TABS as readonly string[]).includes(value);
}

export function GamePage()
{
	const { gamePk, tab } = useParams();
	const navigate = useNavigate();
	const active: Tab = isTab(tab) ? tab : "videos";
	const { data: game, error } = useGame(Number(gamePk));

	if (error)
	{
		return <Text c="red">{error.message}</Text>;
	}
	if (!game)
	{
		return (
			<Group justify="center" py="xl">
				<Loader />
			</Group>
		);
	}

	return (
		<Stack gap="md">
			<Text component={Link} to={`/games/${game.gameDate}`} size="sm" c="dimmed">
				← Scoreboard
			</Text>
			<Group justify="space-between" align="flex-start">
				<div>
					<Title order={2}>
						{game.teams.away.abbreviation} @ {game.teams.home.abbreviation}
					</Title>
					<Text c="dimmed">
						{game.venue?.name} · {game.officialDate}
					</Text>
				</div>
				<Badge size="lg" variant="light">
					{game.status.detailedState}
				</Badge>
			</Group>

			<Title order={3}>
				{game.linescore?.teams.away.runs ?? "-"} –{" "}
				{game.linescore?.teams.home.runs ?? "-"}
			</Title>

			<Tabs
				value={active}
				onChange={(value) =>
				{
					if (isTab(value ?? undefined))
					{
						void navigate(`/game/${game.gamePk}/${value}`);
					}
				}}
			>
				<Tabs.List>
					{TABS.map((t) => (
						<Tabs.Tab key={t} value={t}>
							{t[0]!.toUpperCase() + t.slice(1)}
						</Tabs.Tab>
					))}
				</Tabs.List>

				<Tabs.Panel value="videos" pt="md">
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
				</Tabs.Panel>

				<Tabs.Panel value="live" pt="md">
					<Text>
						Inning {game.linescore?.currentInning ?? "—"} · {game.linescore?.inningState}{" "}
						· {game.linescore?.outs ?? "—"} outs
					</Text>
					<Text c="dimmed" size="sm" mt="xs">
						Live feed projection will land here (ADR-002).
					</Text>
				</Tabs.Panel>

				<Tabs.Panel value="plays" pt="md">
					<PlaysPanel plays={game.plays} />
				</Tabs.Panel>

				<Tabs.Panel value="box" pt="md">
					<Text c="dimmed">Box score: coming next.</Text>
				</Tabs.Panel>

				<Tabs.Panel value="recap" pt="md">
					<Text c="dimmed">Recap / game package: coming next.</Text>
				</Tabs.Panel>
			</Tabs>
		</Stack>
	);
}

import type { AtBat } from "@bt/domain";
import {
	Accordion, Badge, Text,
} from "@mantine/core";
import { AtBatViewer } from "./AtBatViewer.js";

type Props = {
	plays: AtBat[];
};

function atBatLabel(atBat: AtBat): string
{
	const half = atBat.about.halfInning === "top" ? "▲" : "▼";
	return `${half} ${atBat.about.inning} · ${atBat.matchup.batter.fullName} — ${atBat.result.event}`;
}

export function PlaysPanel({ plays }: Props)
{
	if (plays.length === 0)
	{
		return <Text c="dimmed">No pitch-level play data for this game yet.</Text>;
	}

	const defaultValue = String(plays[0]!.about.atBatIndex);

	return (
		<Accordion defaultValue={defaultValue} variant="separated">
			{plays.map((atBat) => (
				<Accordion.Item
					key={atBat.about.atBatIndex}
					value={String(atBat.about.atBatIndex)}
				>
					<Accordion.Control>
						<Text span fw={600}>
							{atBatLabel(atBat)}
						</Text>{" "}
						<Badge size="sm" variant="light" ml="xs">
							{atBat.pitches.length} pitches
						</Badge>
					</Accordion.Control>
					<Accordion.Panel>
						<AtBatViewer atBat={atBat} />
					</Accordion.Panel>
				</Accordion.Item>
			))}
		</Accordion>
	);
}

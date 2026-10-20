import {
	ActionIcon, Box, Group, Text,
} from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { formatOfficialDate } from "./format.js";

interface GameTopBarProps
{
	away: string;
	home: string;
	officialDate: string;
	live: boolean;
}

/**
 * The game view's whole header (S32 `game-topbar`): ← back to that day's
 * scoreboard · `AWY @ HOM` · live indicator while in progress · date.
 * No score, no status, no venue — the owner keeps them out of the header.
 */
export function GameTopBar({
	away, home, officialDate, live,
}: GameTopBarProps)
{
	return (
		<Group component="header" aria-label="Game top bar" data-testid="game-topbar" justify="space-between" wrap="nowrap" py="xs">
			<Group gap="xs" wrap="nowrap">
				<ActionIcon component={Link} to={`/games/${officialDate}`} aria-label="Back to scoreboard" variant="subtle" color="gray">
					<IconChevronLeft size={20} />
				</ActionIcon>
				<Text fw={700}>
					{away} @ {home}
				</Text>
				{live ? (
					<Group gap={4} wrap="nowrap">
						<Box w={8} h={8} bg="var(--bt-accent-2)" style={{
							borderRadius: "50%",
						}} aria-hidden />
						<Text size="xs" fw={700} c="accent2">
							LIVE
						</Text>
					</Group>
				) : null}
			</Group>
			<Text size="sm">{formatOfficialDate(officialDate)}</Text>
		</Group>
	);
}

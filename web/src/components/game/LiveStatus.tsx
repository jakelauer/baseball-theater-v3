import {
	Box, Group, Paper, Stack, Text,
} from "@mantine/core";
import { inningLabel } from "@bt/domain";
import type { GamePayload } from "../../api/game.js";
import type { LayoutVariant } from "../../layout/variant.js";
import { outsLabel } from "./format.js";

/**
 * One count group as pips (S3): `B ●●○`. The group's accessible name carries the
 * value ("Balls: 2 of 3"), so a screen reader hears the count the dots show; the
 * pips themselves are decoration. Filled pips take the group's color; empty ones
 * are dim dots. Balls Accent, strikes Primary Light, outs Light (the frames).
 */
function Pips({
	letter, name, value, slots, color,
}: { letter: string;
	name: string;
	value: number;
	slots: number;
	color: string; })
{
	return (
		<Group gap={3} wrap="nowrap" role="img" aria-label={`${name}: ${value} of ${slots}`} data-testid={`pips-${name.toLowerCase()}`}>
			<Text span fz={11} fw={700} mr={2} aria-hidden>{letter}</Text>
			{Array.from({
				length: slots,
			}, (_, i) => (
				<Box
					key={i}
					w={6}
					h={6}
					data-filled={i < value}
					aria-hidden
					style={{
						borderRadius: "50%",
						background: i < value ? color : "var(--bt-hairline)",
					}}
				/>
			))}
		</Group>
	);
}

/**
 * The Live room's compact status (S3; game-rooms `live-mobile` / `live-medium` /
 * `live-desktop`): the score `NYY 4 · BOS 3`, ball / strike / out pips and the inning.
 * The score lives here, never in the game header (owner, 2026-10-14). On mobile it
 * is a row under the tabs; at medium and desktop it is the status card at the top of
 * the right-hand column, 320px as drawn — `variant` comes from the layout host. The inning text is
 * `inningLabel`'s (packages/domain). The base diamond the frames draw beside it waits
 * for runner data (the Live pitch theater body, S64).
 */
export function LiveStatus({ game, variant }: { game: GamePayload;
	variant: LayoutVariant; })
{
	const { linescore, teams } = game;
	const score = `${teams.away.abbreviation} ${linescore?.teams.away.runs ?? 0} · ${teams.home.abbreviation} ${linescore?.teams.home.runs ?? 0}`;
	const inning = [inningLabel(linescore), outsLabel(linescore?.outs ?? null)].filter(Boolean).join(" · ");
	const pips = (
		<Group gap={10} wrap="nowrap">
			<Pips letter="B" name="Balls" value={linescore?.balls ?? 0} slots={3} color="var(--bt-accent)" />
			<Pips letter="S" name="Strikes" value={linescore?.strikes ?? 0} slots={2} color="var(--bt-primary-light)" />
			<Pips letter="O" name="Outs" value={linescore?.outs ?? 0} slots={2} color="var(--bt-light)" />
		</Group>
	);

	if (variant === "mobile")
	{
		return (
			<Group
				role="status"
				aria-label="Live status"
				data-testid="live-status"
				data-variant={variant}
				justify="space-between"
				wrap="nowrap"
				py={10}
				style={{
					borderBottom: "1px solid var(--bt-hairline)",
				}}
			>
				<Text fz={12} fw={700}>{score}</Text>
				{pips}
				<Text fz={12} fw={700}>{inning}</Text>
			</Group>
		);
	}

	return (
		<Group justify="flex-end">
			<Paper
				role="status"
				aria-label="Live status"
				data-testid="live-status"
				data-variant={variant}
				radius="md"
				px={16}
				py={14}
				w={320}
				style={{
					border: "1px solid var(--bt-light)",
				}}
			>
				<Stack gap={6}>
					<Text fz={11} fw={700}>{score}</Text>
					{pips}
					<Text fz={15} fw={700}>{inning}</Text>
				</Stack>
			</Paper>
		</Group>
	);
}

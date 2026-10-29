import type { AtBat } from "@bt/domain";
import { batterLine, pitcherLine } from "@bt/domain";
import {
	Group, Paper, Text,
} from "@mantine/core";

/** "R" → "RHP", "L" → "LHB": the hand as the frames write it, or nothing when MLB didn't say. */
function hand(side: string | null, role: "P" | "B"): string | null
{
	return side ? `${side}H${role}` : null;
}

/**
 * One player card: role over name, then hand and the game line. Bordered in Light as
 * the frames draw it; no headshot (S41's Plays cards have none either).
 */
function Card({
	role, name, detail,
}: { role: string;
	name: string;
	detail: string; })
{
	return (
		<Paper
			data-testid={`card-${role.toLowerCase()}`}
			radius="md"
			px={14}
			py={12}
			style={{
				flex: 1,
				minWidth: 0,
				border: "1px solid var(--bt-light)",
			}}
		>
			<Text fz={11} fw={700} c="var(--bt-accent)" tt="uppercase">{role}</Text>
			<Text fz={15} fw={700}>{name}</Text>
			<Text fz={12} c="var(--bt-muted)">{detail}</Text>
		</Paper>
	);
}

/**
 * The pitcher and batter cards for one at-bat (S64; game-rooms Live and Plays frames):
 * hand and the line so far — "RHP · 55 Pitches (35 S)", "RHB · 0-1, HR, 1 RBI". The one
 * card component: Live renders it for the current at-bat and Plays (S41) for any
 * expanded at-bat. Totals run through `atBat` only (`pitcherLine` / `batterLine` in
 * packages/domain), so an early at-bat spoils nothing (owner, 2026-10-19).
 */
export function MatchupCards({ plays, atBat }: { plays: readonly AtBat[];
	atBat: AtBat; })
{
	const {
		batter, pitcher, batSide, pitchHand,
	} = atBat.matchup;
	const through = atBat.about.atBatIndex;
	const p = pitcherLine(plays, pitcher.id, through);
	const b = batterLine(plays, batter.id, through);
	const batting = [
		`${b.hits}-${b.atBats}`,
		b.homeRuns > 0 ? (b.homeRuns === 1 ? "HR" : `${b.homeRuns} HR`) : null,
		b.rbi > 0 ? `${b.rbi} RBI` : null,
	].filter(Boolean).join(", ");
	return (
		<Group gap={10} wrap="nowrap" align="stretch" data-testid="matchup-cards">
			<Card
				role="Pitcher"
				name={pitcher.fullName}
				detail={[hand(pitchHand, "P"), `${p.pitches} Pitches (${p.strikes} S)`].filter(Boolean).join(" · ")}
			/>
			<Card
				role="Batter"
				name={batter.fullName}
				detail={[hand(batSide, "B"), batting].filter(Boolean).join(" · ")}
			/>
		</Group>
	);
}

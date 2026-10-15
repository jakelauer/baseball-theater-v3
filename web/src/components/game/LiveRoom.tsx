import { Text } from "@mantine/core";
import type { GamePayload } from "../../api/game.js";

/** Baseline Live room — inning / state / outs. S3 builds the ratified status row. */
export function LiveRoom({ game }: { game: GamePayload })
{
	const { linescore } = game;
	return (
		<>
			<Text>
				Inning {linescore?.currentInning ?? "—"} · {linescore?.inningState} · {linescore?.outs ?? "—"} outs
			</Text>
			<Text c="dimmed" size="sm" mt="xs">
				Live feed projection will land here (ADR-002).
			</Text>
		</>
	);
}

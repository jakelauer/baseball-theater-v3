import { Box, Paper } from "@mantine/core";
import type { CSSProperties } from "react";
import { linescoreCells } from "@bt/domain";
import type { GamePayload } from "../../api/game.js";

const HEAD: CSSProperties = {
	color: "var(--bt-muted)",
	fontSize: 11,
	fontWeight: 400,
	textAlign: "center",
	padding: "0 0 8px",
};

const TEAM: CSSProperties = {
	fontSize: 13,
	fontWeight: 700,
	textAlign: "left",
	paddingRight: 8,
};

const TOTAL: CSSProperties = {
	fontSize: 13,
	fontWeight: 700,
	textAlign: "center",
	width: 24,
};

/**
 * The full linescore with each inning in its own box (S2; game-rooms Box and Plays
 * frames — owner, 2026-10-14: "Plays and Box Score should have a full line score with
 * boxes for the innings"). One component for both rooms: Plays (S41) reuses it.
 * The cells and run totals come from `linescoreCells` in `packages/domain`
 * (ADR-025); this only draws them. Unplayed innings are empty boxes.
 */
export function Linescore({
	linescore, away, home,
}: {
	linescore: GamePayload["linescore"];
	away: string;
	home: string;
})
{
	const cells = linescoreCells(linescore, linescore?.scheduledInnings ?? 9);
	const rows = [
		{
			abbr: away,
			row: cells.away,
			line: linescore?.teams.away,
		},
		{
			abbr: home,
			row: cells.home,
			line: linescore?.teams.home,
		},
	];
	return (
		<Paper
			bg="var(--bt-raised)"
			radius="md"
			p={12}
			style={{
				border: "1px solid var(--bt-hairline)",
			}}
		>
			<Box component="table" aria-label="Linescore" w="100%" style={{
				borderCollapse: "separate",
				borderSpacing: "2px 0",
			}}
			>
				<thead>
					<tr style={{
						borderBottom: "1px solid var(--bt-hairline)",
					}}
					>
						<th scope="col" style={{
							...HEAD,
							textAlign: "left",
						}}
						>TEAM
						</th>
						{cells.innings.map((num) => <th key={num} scope="col" style={HEAD}>{num}</th>)}
						<th aria-hidden style={{
							width: "100%",
						}}
						/>
						<th scope="col" style={HEAD}>R</th>
						<th scope="col" style={HEAD}>H</th>
						<th scope="col" style={HEAD}>E</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({
						abbr, row, line,
					}) => (
						<tr key={abbr} data-testid="linescore-row">
							<th scope="row" style={{
								...TEAM,
								paddingTop: 8,
							}}
							>{abbr}
							</th>
							{row.cells.map((runs, i) => (
								<td key={cells.innings[i]} style={{
									paddingTop: 8,
								}}
								>
									<Box
										data-testid="inning-cell"
										w={20}
										h={22}
										fz={13}
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											border: "1px solid var(--bt-hairline)",
											borderRadius: 3,
										}}
									>
										{runs ?? ""}
									</Box>
								</td>
							))}
							<td />
							<td style={{
								...TOTAL,
								paddingTop: 8,
							}}
							>{row.runs}
							</td>
							<td style={{
								...TOTAL,
								paddingTop: 8,
							}}
							>{line?.hits ?? ""}
							</td>
							<td style={{
								...TOTAL,
								paddingTop: 8,
							}}
							>{line?.errors ?? ""}
							</td>
						</tr>
					))}
				</tbody>
			</Box>
		</Paper>
	);
}

import { baseRunners } from "@bt/domain";
import type { GamePayload } from "../../api/game.js";

const BASES = [
	{
		key: "second",
		name: "second",
		x: 14,
		y: 2,
	},
	{
		key: "third",
		name: "third",
		x: 4,
		y: 12,
	},
	{
		key: "first",
		name: "first",
		x: 24,
		y: 12,
	},
] as const;

/**
 * The base diamond (S64; game-rooms Live frames): three small bases, filled Accent where
 * a runner stands and outlined where none does. Which bases are occupied is
 * `baseRunners`'s (packages/domain); this only draws it. The accessible name says it in
 * words, so the picture is never the only way to know.
 */
export function BaseDiamond({ live }: { live: GamePayload["live"] })
{
	const runners = baseRunners(live);
	const on = BASES.filter((base) => runners[base.key]).map((base) => base.name);
	const label = on.length === 0 ? "Bases empty" : `Runners on ${on.join(", ")}`;
	return (
		<svg role="img" aria-label={label} data-testid="base-diamond" width={34} height={24} viewBox="0 0 34 24">
			{BASES.map((base) => (
				<rect
					key={base.key}
					data-testid={`base-${base.key}`}
					data-occupied={runners[base.key]}
					x={base.x}
					y={base.y}
					width={7}
					height={7}
					transform={`rotate(45 ${base.x + 3.5} ${base.y + 3.5})`}
					fill={runners[base.key] ? "var(--bt-accent)" : "none"}
					stroke={runners[base.key] ? "var(--bt-accent)" : "var(--bt-light)"}
					strokeWidth={1.5}
				/>
			))}
		</svg>
	);
}

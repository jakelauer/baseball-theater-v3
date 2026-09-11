import type { PitchEvent, TrajectoryPoint } from "@bt/domain";
import { sampleBattedBallTrajectory, samplePitchTrajectory } from "@bt/domain";
import {
	Box, Group, Text,
} from "@mantine/core";
import {
	useEffect, useMemo, useState,
} from "react";
import { kinematicsFromPitch, pitchDotColor } from "./utils.js";

type Props = {
	pitch: PitchEvent | null;
	playing: boolean;
	onPlaybackEnd?: () => void;
};

type ViewBox = { minX: number;
	maxX: number;
	minY: number;
	maxY: number };

function mapPath(
	points: TrajectoryPoint[],
	map: (p: TrajectoryPoint) => { x: number;
		y: number },
	vb: ViewBox,
	width: number,
	height: number,
): string
{
	const sx = (x: number) => ((x - vb.minX) / (vb.maxX - vb.minX)) * width;
	const sy = (y: number) => height - ((y - vb.minY) / (vb.maxY - vb.minY)) * height;
	return points
		.map((p, i) =>
		{
			const { x, y } = map(p);
			return `${i === 0 ? "M" : "L"} ${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`;
		})
		.join(" ");
}

function TrajectoryPanel({
	title,
	width,
	height,
	pathD,
	ball,
	vb,
}: {
	title: string;
	width: number;
	height: number;
	pathD: string;
	ball: { x: number;
		y: number } | null;
	vb: ViewBox;
})
{
	const sx = (x: number) => ((x - vb.minX) / (vb.maxX - vb.minX)) * width;
	const sy = (y: number) => height - ((y - vb.minY) / (vb.maxY - vb.minY)) * height;

	return (
		<Box>
			<Text size="sm" c="dimmed" mb={4}>
				{title}
			</Text>
			<svg width={width} height={height} style={{
				display: "block",
				borderRadius: 8,
			}}>
				<rect width={width} height={height} fill="var(--mantine-color-dark-7)" rx={8} />
				<path d={pathD} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
				{ball ? (
					<circle
						cx={sx(ball.x)}
						cy={sy(ball.y)}
						r={6}
						fill="white"
						stroke="#111"
						strokeWidth={1}
					/>
				) : null}
			</svg>
		</Box>
	);
}

export function PitchTrajectoryView({
	pitch, playing, onPlaybackEnd,
}: Props)
{
	const [progress, setProgress] = useState(0);

	const { pitchPath, hitPath } = useMemo(() =>
	{
		if (!pitch?.pitchData)
			return {
				pitchPath: [] as TrajectoryPoint[],
				hitPath: [] as TrajectoryPoint[],
			};
		const pitchPath = samplePitchTrajectory(kinematicsFromPitch(pitch.pitchData), {
			plateTime: pitch.pitchData.plateTime,
		});
		const hitPath =
			pitch.hitData && pitch.details.isInPlay
				? sampleBattedBallTrajectory(pitch.hitData)
				: [];
		return {
			pitchPath,
			hitPath,
		};
	}, [pitch]);

	useEffect(() =>
	{
		setProgress(0);
	}, [pitch?.playId]);

	useEffect(() =>
	{
		if (!playing || pitchPath.length === 0) return;
		let frame = 0;
		const start = performance.now();
		const durationMs = 900;
		let raf = 0;
		const tick = (now: number) =>
		{
			const t = Math.min(1, (now - start) / durationMs);
			setProgress(t);
			if (t < 1)
			{
				raf = requestAnimationFrame(tick);
			}
			else
			{
				onPlaybackEnd?.();
			}
			frame++;
			void frame;
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [playing, pitchPath, onPlaybackEnd]);

	if (!pitch?.pitchData)
	{
		return <Text c="dimmed">Select a pitch to see trajectory.</Text>;
	}

	const pitchIdx = Math.min(
		pitchPath.length - 1,
		Math.floor(progress * (pitchPath.length - 1)),
	);
	const pitchPoint = pitchPath[pitchIdx] ?? null;

	const hitIdx =
		hitPath.length > 0
			? Math.min(
				hitPath.length - 1,
				Math.floor(Math.max(0, progress - 0.55) * 2.2 * (hitPath.length - 1)),
			)
			: 0;
	const hitPoint =
		progress > 0.55 && hitPath.length > 0 ? (hitPath[hitIdx] ?? null) : null;

	const sidePath = mapPath(
		pitchPath,
		(p) => ({
			x: p.y,
			y: p.z,
		}),
		{
			minX: 0,
			maxX: 55,
			minY: 0,
			maxY: 8,
		},
		280,
		160,
	);
	const topPath = mapPath(
		pitchPath,
		(p) => ({
			x: p.x,
			y: p.z,
		}),
		{
			minX: -2.5,
			maxX: 2.5,
			minY: 0,
			maxY: 8,
		},
		280,
		160,
	);

	const hitSidePath =
		hitPath.length > 0
			? mapPath(
				hitPath,
				(p) => ({
					x: p.y,
					y: p.z,
				}),
				{
					minX: 0,
					maxX: Math.max(420, pitch.hitData?.totalDistance ?? 300),
					minY: 0,
					maxY: 120,
				},
				280,
				160,
			)
			: "";

	return (
		<Box>
			<Group justify="space-between" mb="xs">
				<Text fw={600}>
					#{pitch.pitchNumber} {pitch.details.typeDescription ?? pitch.details.type}
				</Text>
				<Text size="sm" c="dimmed">
					{pitch.pitchData.startSpeed.toFixed(1)} → {pitch.pitchData.endSpeed.toFixed(1)}{" "}
					mph
					{pitch.pitchData.breaks?.spinRate
						? ` · ${Math.round(pitch.pitchData.breaks.spinRate)} rpm`
						: ""}
				</Text>
			</Group>
			<Group align="flex-start" gap="md" wrap="wrap">
				<TrajectoryPanel
					title="Side view (release → plate)"
					width={280}
					height={160}
					pathD={sidePath}
					ball={pitchPoint ? {
						x: pitchPoint.y,
						y: pitchPoint.z,
					} : null}
					vb={{
						minX: 0,
						maxX: 55,
						minY: 0,
						maxY: 8,
					}}
				/>
				<TrajectoryPanel
					title="Top-down (horizontal break)"
					width={280}
					height={160}
					pathD={topPath}
					ball={pitchPoint ? {
						x: pitchPoint.x,
						y: pitchPoint.z,
					} : null}
					vb={{
						minX: -2.5,
						maxX: 2.5,
						minY: 0,
						maxY: 8,
					}}
				/>
			</Group>
			{pitch.hitData && pitch.details.isInPlay ? (
				<Box mt="md">
					<Text size="sm" c="dimmed" mb={4}>
						Batted ball · {pitch.hitData.launchSpeed.toFixed(0)} mph /{" "}
						{pitch.hitData.launchAngle.toFixed(0)}° · {pitch.hitData.trajectory} (
						{pitch.hitData.totalDistance} ft)
					</Text>
					<svg width={280} height={160} style={{
						display: "block",
						borderRadius: 8,
					}}>
						<rect width={280} height={160} fill="var(--mantine-color-dark-7)" rx={8} />
						<path
							d={hitSidePath}
							fill="none"
							stroke={pitchDotColor(pitch)}
							strokeWidth={2.5}
						/>
						{hitPoint ? (
							<circle
								cx={(hitPoint.y / Math.max(420, pitch.hitData.totalDistance)) * 280}
								cy={160 - (hitPoint.z / 120) * 160}
								r={6}
								fill={pitchDotColor(pitch)}
								stroke="#111"
								strokeWidth={1}
							/>
						) : null}
					</svg>
				</Box>
			) : null}
		</Box>
	);
}

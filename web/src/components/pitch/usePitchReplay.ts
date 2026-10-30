import type { PitchEvent, TrajectoryPoint } from "@bt/domain";
import {
	pitchFlight, pitchPlayback, sampleBattedBallTrajectory,
} from "@bt/domain";
import {
	useEffect, useMemo, useRef, useState,
} from "react";

/**
 * A replay's clock: while `running`, seconds since it started, advanced every animation
 * frame from the real time elapsed — so a replay moves smoothly at the pace of what it
 * shows — until `isDone(seconds)`, when `onEnd` fires once. Restarts from 0 whenever it
 * starts running again or `restartKey` changes.
 */
export function useReplayClock(running: boolean, isDone: (seconds: number) => boolean, onEnd: (() => void) | undefined, restartKey?: unknown): number
{
	const [elapsed, setElapsed] = useState(0);
	// The latest callbacks, so a parent's inline arrow doesn't restart the clock.
	const done = useRef(isDone);
	done.current = isDone;
	const ended = useRef(onEnd);
	ended.current = onEnd;

	useEffect(() =>
	{
		setElapsed(0);
		if (!running) return;
		const start = performance.now();
		let raf = 0;
		const tick = (now: number) =>
		{
			const seconds = (now - start) / 1000;
			setElapsed(seconds);
			if (done.current(seconds)) ended.current?.();
			else raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [running, restartKey]);

	return elapsed;
}

/**
 * A real-time replay of one pitch (S64), shared by the catcher's view and the side /
 * top charts: its flight from the hand (`pitchFlight`), its batted-ball arc when
 * `withHit` and it was put in play, and where the ball is now (`pitchPlayback`).
 * While `playing` it runs on `useReplayClock`, so it takes exactly as long as the pitch
 * was in the air (owner, 2026-10-29: "does the animation take the same amount of time
 * the pitch was in the air?"). `onEnd` fires once when it has run out.
 */
export function usePitchReplay(pitch: PitchEvent | null, playing: boolean, onEnd: (() => void) | undefined, withHit: boolean)
{
	// Memoized on the pitch: the clock restarts whenever these change.
	const paths = useMemo(() => ({
		flight: pitch?.pitchData ? pitchFlight(pitch.pitchData) : [] as TrajectoryPoint[],
		hit: withHit && pitch?.hitData && pitch.details.isInPlay ? sampleBattedBallTrajectory(pitch.hitData) : [] as TrajectoryPoint[],
	}), [pitch, withHit]);
	const { flight, hit } = paths;
	const elapsed = useReplayClock(playing && flight.length > 0, (seconds) => pitchPlayback(flight, hit, seconds).done, onEnd, paths);

	return {
		flight,
		hit,
		replay: pitchPlayback(flight, hit, elapsed),
	};
}

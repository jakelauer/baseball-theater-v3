import {
	Profiler, type ProfilerOnRenderCallback, type ReactNode,
} from "react";

export type RenderCounter = {
	/** Wrap the view being measured; every commit inside it counts once. */
	Counted: (props: { children: ReactNode }) => ReactNode;
	/** Commits so far: one `mount` plus one per `update`. */
	count: () => number;
	/** Forget commits so far, e.g. after mount, to count only what follows. */
	reset: () => void;
};

/**
 * Render-count harness for heavy views (ADR-026): wraps a subtree in React's
 * `<Profiler>` and counts its commits, so a test can pin how many times a view
 * re-renders for one state change and catch a regression that multiplies it.
 * Counts commits of the whole wrapped subtree, not of one component — wrap the
 * view itself, not the page around it. Relies on Profiler's `onRender`, which
 * React calls in development builds (Vitest runs those).
 */
export function createRenderCounter(id = "measured"): RenderCounter
{
	let commits = 0;
	const onRender: ProfilerOnRenderCallback = () =>
	{
		commits += 1;
	};
	return {
		Counted: ({ children }) => <Profiler id={id} onRender={onRender}>{children}</Profiler>,
		count: () => commits,
		reset: () =>
		{
			commits = 0;
		},
	};
}

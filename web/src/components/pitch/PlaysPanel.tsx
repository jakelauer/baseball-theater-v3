import type { AtBat } from "@bt/domain";
import {
	Accordion, Badge, Stack, Text,
} from "@mantine/core";
import {
	useEffect, useRef, useState,
} from "react";
import { flushSync } from "react-dom";
import { AtBatViewer } from "./AtBatViewer.js";

type Props = {
	plays: AtBat[];
};

/**
 * An open at-bat's header: the matchup, inning and final count, what happened, and the
 * result — in place of the one-line label, rather than repeating it in a box below
 * (owner, 2026-10-29: "When expanded, can the accordion header show the data that's in
 * this box instead of having both the header and the box?").
 */
function OpenHeader({ atBat }: { atBat: AtBat })
{
	return (
		<Stack gap={4} align="flex-start">
			<Text fw={700}>
				{atBat.matchup.batter.fullName} vs {atBat.matchup.pitcher.fullName}
			</Text>
			<Text size="sm" c="dimmed">
				{atBat.about.halfInning === "top" ? "Top" : "Bottom"} {atBat.about.inning} ·{" "}
				{atBat.count.balls}-{atBat.count.strikes}, {atBat.count.outs} out
				{atBat.count.outs === 1 ? "" : "s"}
			</Text>
			<Text>{atBat.result.description}</Text>
			{/* Under the text, not beside it, so a long result isn't clipped by the chevron. */}
			<Badge color={atBat.result.isOut ? "gray" : "teal"} variant="light" style={{
				flexShrink: 0,
			}}>
				{atBat.result.event}
			</Badge>
		</Stack>
	);
}

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

	return <PlaysAccordion plays={plays} />;
}

/** How long an at-bat takes to open, in ms. */
const OPEN_MS = 200;

/** Calls `then` once a smooth scroll has finished: on `scrollend`, or after a second without one. Returns a cancel. */
function afterScroll(then: () => void): () => void
{
	let done = false;
	const finish = () =>
	{
		if (done) return;
		done = true;
		window.removeEventListener("scrollend", finish);
		then();
	};
	window.addEventListener("scrollend", finish, {
		once: true,
	});
	const timer = window.setTimeout(finish, 1000);
	return () =>
	{
		done = true;
		window.clearTimeout(timer);
		window.removeEventListener("scrollend", finish);
	};
}

/**
 * The at-bats as an accordion, one open at a time. Opening one happens in three steps
 * so nothing moves under the reader at once (owner, 2026-10-29: "Opening an at bat
 * should scroll the accordion item to the top of the screen"; "The accordion animation
 * is janky because the open one closes while the scrolling animation is happening"):
 * the open at-bat closes instantly with the tapped one held where it was on screen,
 * the tapped one scrolls to the top, then it opens. Once it's open its pitches replay
 * in turn ("Opening an at bat should animate each pitch in quick succession, starting
 * after the top of screen animation is completed").
 */
function PlaysAccordion({ plays }: Props)
{
	const [open, setOpen] = useState<string | null>(String(plays[0]!.about.atBatIndex));
	// 0 while the old at-bat snaps shut; the open animation otherwise.
	const [duration, setDuration] = useState(OPEN_MS);
	// The at-bat being opened, until its pitches start replaying.
	const pending = useRef<string | null>(null);
	// Which at-bat to replay, and a fresh token each time.
	const [autoplay, setAutoplay] = useState<{ value: string;
		token: number } | null>(null);

	// Waits still pending (a scroll's end, the open animation's fallback), cancelled on unmount.
	const waits = useRef<(() => void)[]>([]);
	useEffect(() => () => waits.current.forEach((cancel) => cancel()), []);
	const later = (run: () => void, ms: number) =>
	{
		const timer = window.setTimeout(run, ms);
		waits.current.push(() => window.clearTimeout(timer));
	};

	const replay = (value: string) =>
	{
		if (pending.current !== value) return;
		pending.current = null;
		setAutoplay((last) => ({
			value,
			token: (last?.token ?? 0) + 1,
		}));
	};

	const choose = (value: string | null) =>
	{
		pending.current = value;
		const item = value === null ? null : document.getElementById(`at-bat-${value}`);
		if (value === null || !item)
		{
			setDuration(OPEN_MS);
			setOpen(value);
			return;
		}
		// 1. Close the open at-bat at once, keeping the tapped one where it was on screen
		//    (the closed one above it would otherwise pull it up).
		const before = item.getBoundingClientRect().top;
		flushSync(() =>
		{
			setDuration(0);
			setOpen(null);
		});
		window.scrollBy(0, item.getBoundingClientRect().top - before);
		// 2. Scroll it to the top. 3. Then open it; its pitches replay once it's open.
		const opened = () =>
		{
			if (pending.current !== value) return;
			setDuration(OPEN_MS);
			setOpen(value);
			// The open animation reports its end (`settled`); this covers reduced motion,
			// where there is no animation to end.
			later(() => replay(value), OPEN_MS + 400);
		};
		if (Math.abs(item.getBoundingClientRect().top) < 2)
		{
			opened();
			return;
		}
		item.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
		waits.current.push(afterScroll(opened));
	};

	return (
		<Accordion value={open} onChange={choose} variant="separated" transitionDuration={duration}>
			{plays.map((atBat) => (
				<Accordion.Item
					id={`at-bat-${atBat.about.atBatIndex}`}
					key={atBat.about.atBatIndex}
					value={String(atBat.about.atBatIndex)}
				>
					<Accordion.Control aria-label={atBatLabel(atBat)}>
						{open === String(atBat.about.atBatIndex) ? <OpenHeader atBat={atBat} /> : (
							<>
								<Text span fw={600}>
									{atBatLabel(atBat)}
								</Text>{" "}
								<Badge size="sm" variant="light" ml="xs">
									{atBat.pitches.length} pitches
								</Badge>
							</>
						)}
					</Accordion.Control>
					<Accordion.Panel onTransitionEnd={() => replay(String(atBat.about.atBatIndex))}>
						{/* Only the open at-bat is mounted, so a closed one's replay stops with it. */}
						{open === String(atBat.about.atBatIndex) ? (
							<AtBatViewer atBat={atBat} autoplay={autoplay?.value === open ? autoplay.token : 0} />
						) : null}
					</Accordion.Panel>
				</Accordion.Item>
			))}
		</Accordion>
	);
}

import {
	Button, Loader, Stack, Text, Title,
} from "@mantine/core";

/**
 * The page and room states the frames draw (S31 `scoreboard-loading/empty/error-*`,
 * S33 `room-*-mobile`), one implementation for every page and room (S60):
 *
 * - `loading` keeps the page title above a centered loader, so the page doesn't jump when data lands;
 * - `empty` is one muted sentence;
 * - `error` is a Primary Light title, the recovery hint and Retry (red text on Dark uses Primary Light).
 */
export type ViewStateProps =
	| {
		kind: "loading";
		/** The page's heading, kept while loading. Rooms sit under the game top bar and pass none. */
		title?: string;
	}
	| {
		kind: "empty";
		message: string;
	}
	| {
		kind: "error";
		/** What failed, e.g. "Couldn't load games" or "Couldn't load this room". */
		title: string;
		onRetry: () => void;
	};

export function ViewState(props: ViewStateProps)
{
	if (props.kind === "loading")
	{
		return (
			<Stack gap="lg">
				{props.title ? <Title order={2}>{props.title}</Title> : null}
				<Stack align="center" py="xl">
					<Loader aria-label="Loading" />
				</Stack>
			</Stack>
		);
	}
	if (props.kind === "empty")
	{
		return (
			<Stack align="center" py="xl">
				<Text c="dimmed">{props.message}</Text>
			</Stack>
		);
	}
	return (
		<Stack align="center" gap={4} py="xl" role="alert">
			<Text fw={700} c="var(--bt-primary-light)">
				{props.title}
			</Text>
			<Text size="xs" c="var(--bt-primary-light)">
				Check your connection and try again
			</Text>
			<Button variant="subtle" color="primary" c="var(--bt-primary-light)" onClick={props.onRetry}>
				Retry
			</Button>
		</Stack>
	);
}

import {
	Button, Loader, Stack, Text,
} from "@mantine/core";

/**
 * The one ratified loading / empty / error example (S33 `room-*-mobile`),
 * shared by every game room. Error copy is Primary Light — red text on Dark.
 */
export function RoomLoading()
{
	return (
		<Stack align="center" py="xl">
			<Loader aria-label="Loading" />
		</Stack>
	);
}

export function RoomEmpty({ message }: { message: string })
{
	return (
		<Stack align="center" py="xl">
			<Text c="dimmed">{message}</Text>
		</Stack>
	);
}

export function RoomError({ onRetry }: { onRetry: () => void })
{
	return (
		<Stack align="center" gap={4} py="xl" role="alert">
			<Text fw={700} c="var(--bt-primary-light)">
				Couldn't load this room
			</Text>
			<Text size="xs" c="var(--bt-primary-light)">
				Check your connection and try again
			</Text>
			<Button variant="subtle" color="primary" c="var(--bt-primary-light)" onClick={onRetry}>
				Retry
			</Button>
		</Stack>
	);
}

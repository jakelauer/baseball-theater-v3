import {
	ActionIcon, Burger, Group, UnstyledButton, Text,
} from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useSession } from "../session/session.js";
import { Wordmark } from "./Wordmark.js";

/**
 * The account control at the header's right (S56 A2). Signed in, the icon leads
 * to Settings, where the Account group is. Signed out, "Sign in" beside the icon
 * calls `signIn()` — BT has no sign-in screen of its own; Logto's provides it
 * (owner, 2026-10-22). While the session loads it draws nothing, so it doesn't flash.
 */
function AccountControl()
{
	const session = useSession();
	if (session.status === "loading") return null;
	if (session.status === "signedIn")
	{
		return (
			<ActionIcon component={Link} to="/settings" aria-label="Account" variant="subtle" color="gray" size="lg">
				<IconUser size={22} />
			</ActionIcon>
		);
	}
	return (
		<UnstyledButton onClick={() => void session.signIn()}>
			<Group gap={8} wrap="nowrap">
				<Text size="sm" c="dimmed">
					Sign in
				</Text>
				<IconUser size={22} aria-hidden />
			</Group>
		</UnstyledButton>
	);
}

/**
 * The app header (S31 `header-mobile`; S56 A2 desktop): burger · wordmark ·
 * account. The burger opens the nav drawer on mobile and medium; desktop has
 * no burger because the rail is the navigation. Game routes draw the game top
 * bar instead of this header.
 */
export function AppHeader({
	burger, drawerOpened, onBurger,
}: {
	burger: boolean;
	drawerOpened: boolean;
	onBurger: () => void;
})
{
	return (
		<Group
			component="header"
			h={56}
			px="md"
			justify="space-between"
			wrap="nowrap"
			style={{
				borderBottom: "1px solid var(--mantine-color-dark-4)",
				flexShrink: 0,
			}}
		>
			<Group gap="md" wrap="nowrap">
				{burger ? <Burger opened={drawerOpened} onClick={onBurger} size="sm" aria-label="Open navigation" /> : null}
				<Link to="/games" aria-label="Scoreboard home">
					<Wordmark />
				</Link>
			</Group>
			<AccountControl />
		</Group>
	);
}

import {
	AppShell, Burger, Group, Text, NavLink, Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const NAV = [
	{
		to: "/games",
		label: "Scoreboard",
	},
	{
		to: "/standings",
		label: "Standings",
	},
	{
		to: "/search",
		label: "Search",
	},
	{
		to: "/settings",
		label: "Settings",
	},
];

export function AppShellLayout({ children }: { children: ReactNode })
{
	const [opened, { toggle }] = useDisclosure();
	const location = useLocation();

	return (
		<AppShell
			header={{
				height: 64,
			}}
			navbar={{
				width: 240,
				breakpoint: "sm",
				collapsed: {
					mobile: !opened,
				},
			}}
			padding="md"
		>
			<AppShell.Header
				style={{
					background: "rgba(7, 20, 15, 0.85)",
					backdropFilter: "blur(10px)",
					borderBottom: "1px solid rgba(232, 226, 214, 0.12)",
				}}
			>
				<Group h="100%" px="md" justify="space-between">
					<Group>
						<Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
						<div>
							<Title order={3} style={{
								fontFamily: "Fraunces, Georgia, serif",
							}}>
								Baseball Theater
							</Title>
							<Text size="xs" c="dimmed">
								v3 · local fixtures
							</Text>
						</div>
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Navbar
				p="md"
				style={{
					background: "rgba(5, 17, 12, 0.92)",
					borderRight: "1px solid rgba(232, 226, 214, 0.08)",
				}}
			>
				{NAV.map((item) => (
					<NavLink
						key={item.to}
						component={Link}
						to={item.to}
						label={item.label}
						active={location.pathname.startsWith(item.to)}
						onClick={() => opened && toggle()}
					/>
				))}
			</AppShell.Navbar>

			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
}

import {
	Box, NavLink, Stack, Text,
} from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { DevSessionControl } from "../session/DevSessionControl.js";
import { useSession } from "../session/session.js";
import { NAV, activeSection } from "./nav.js";
import { VERSION_LINE } from "./version.js";
import { Wordmark } from "./Wordmark.js";

/**
 * The 240px nav rail (S31 `nav-rail`): wordmark, sections with the active one
 * filled Primary and marked `aria-current`, and the build's version line at its
 * foot with no label (S56 A2). The desktop host shows it beside the page; on
 * mobile and medium it is the drawer's content, and `onNavigate` closes the drawer.
 */
export function NavRail({ onNavigate }: { onNavigate?: () => void })
{
	const { pathname } = useLocation();
	const signedIn = useSession().status === "signedIn";
	const active = activeSection(pathname);

	return (
		<Stack h="100%" justify="space-between" p="md" gap="md">
			<Stack gap="xl">
				<Box px="xs" pt={4}>
					<Wordmark />
				</Box>
				<Stack gap={4} component="ul" m={0} p={0} style={{
					listStyle: "none",
				}}>
					{NAV.filter((item) => signedIn || !item.signedInOnly).map((item) => (
						<li key={item.to}>
							<NavLink
								component={Link}
								to={item.to}
								label={item.label}
								active={item.to === active}
								aria-current={item.to === active ? "page" : undefined}
								variant="filled"
								color="primary"
								onClick={onNavigate}
								style={{
									borderRadius: 8,
								}}
							/>
						</li>
					))}
				</Stack>
			</Stack>
			<Stack gap="xs" align="flex-start">
				<DevSessionControl />
				<Text size="xs" c="dimmed" data-testid="version-line">
					{VERSION_LINE}
				</Text>
			</Stack>
		</Stack>
	);
}

import type { OpensFirst } from "@bt/domain";
import { MLB_TEAMS, OPENS_FIRST_ROOMS } from "@bt/domain";
import {
	Anchor, MultiSelect, Radio, SimpleGrid, Stack, Text, Title,
} from "@mantine/core";
import type { ReactNode } from "react";
import { roomLabel } from "../components/game/format.js";
import type { LayoutVariant } from "../layout/variant.js";
import { useSession } from "../session/session.js";
import { AccountData } from "./settings/AccountData.js";
import {
	setFavoriteTeams, setOpensFirst, useSettings,
} from "../settings/store.js";

const TEAM_OPTIONS = MLB_TEAMS.map((team) => ({
	value: String(team.id),
	label: team.abbreviation,
}));

/** One titled group of the ratified Settings frame (Game List · Game Detail · Account). */
function SettingsGroup({ title, children }: { title: string;
	children: ReactNode })
{
	return (
		<Stack gap="xs" component="section" aria-label={title}>
			<Title order={2} size="h4">{title}</Title>
			{children}
		</Stack>
	);
}

/**
 * Settings, as the ratified frames draw it (standings-search-settings, A3):
 * Game List (Favorite Teams) on the left, Game Detail (Opens First) and Account
 * on the right; one column on mobile. Every control is one this story can make
 * work; the slot, collapse, Hide Scores and Video Player controls arrive with
 * the screens that read them (S67, S68, S70), and the Patreon rows with the
 * Patreon link. Signed-in only (the route guards it), so the session has an
 * account. Download and delete your data sit at the end of Account (A4, S79).
 */
export function SettingsPage({ variant }: { variant: LayoutVariant })
{
	const settings = useSettings();
	const session = useSession();
	const columns = variant === "mobile" ? 1 : 2;

	return (
		<Stack>
			<Title order={1}>Settings</Title>
			<SimpleGrid cols={columns} spacing="xl" data-columns={columns}>
				<Stack gap="xl">
					<SettingsGroup title="Game List">
						<MultiSelect
							label="Favorite Teams"
							data={TEAM_OPTIONS}
							value={settings.favoriteTeamIds.map(String)}
							onChange={(ids) => void setFavoriteTeams(ids.map(Number))}
							searchable
						/>
					</SettingsGroup>
				</Stack>
				<Stack gap="xl">
					<SettingsGroup title="Game Detail">
						<Radio.Group
							label="Opens First"
							value={settings.opensFirst}
							onChange={(room) => void setOpensFirst(room as OpensFirst)}
						>
							<Stack gap="xs" mt="xs">
								{OPENS_FIRST_ROOMS.map((room) => <Radio key={room} value={room} label={roomLabel(room)} />)}
							</Stack>
						</Radio.Group>
					</SettingsGroup>
					<SettingsGroup title="Account">
						{session.status === "signedIn" && <Text>Signed in as {session.account.email}</Text>}
						{/* A text link, not a button (A3, owner 2026-10-22: "Text link"). */}
						<Anchor
							href="#"
							underline="always"
							c="inherit"
							onClick={(event) =>
							{
								event.preventDefault();
								session.signOut();
							}}
						>
							Sign out
						</Anchor>
						<AccountData variant={variant} />
					</SettingsGroup>
				</Stack>
			</SimpleGrid>
		</Stack>
	);
}

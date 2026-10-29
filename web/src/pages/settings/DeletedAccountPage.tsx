import { Stack, Text } from "@mantine/core";

/**
 * What `/settings` shows once, right after an account is deleted (S79, to
 * standings-search-settings A5): an otherwise blank page with one line — no
 * dismiss, no action, no footer (owner, 2026-10-29: "the deletion message should
 * be on an otherwise blank page. Not dismissable. It should be the settings page").
 * The app's signed-out chrome stays around it.
 */
export function DeletedAccountPage()
{
	return (
		<Stack align="center" pt={160} px="md">
			<Text fz={16} c="var(--bt-light)" ta="center">
				Your account and your data are deleted.
			</Text>
		</Stack>
	);
}

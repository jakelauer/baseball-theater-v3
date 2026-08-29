import { Stack, Text, Title } from "@mantine/core";

export function SettingsPage() {
  return (
    <Stack>
      <Title order={2}>Settings</Title>
      <Text c="dimmed">
        Stub — favorites, hide scores, sync. Auth: magic link + passkeys; Patreon link for
        tiers.
      </Text>
    </Stack>
  );
}

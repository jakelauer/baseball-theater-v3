import type { AtBat } from "@bt/domain";
import {
  Badge,
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { PitchTrajectoryView } from "./PitchTrajectoryView";
import { StrikeZoneChart } from "./StrikeZoneChart";

type Props = {
  atBat: AtBat;
};

export function AtBatViewer({ atBat }: Props) {
  const firstPitch = atBat.pitches[0]?.pitchNumber ?? null;
  const [selectedPitchNumber, setSelectedPitchNumber] = useState<number | null>(
    firstPitch,
  );
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSelectedPitchNumber(atBat.pitches[0]?.pitchNumber ?? null);
    setPlaying(false);
  }, [atBat.about.atBatIndex, atBat.pitches]);

  const selectedPitch = useMemo(
    () => atBat.pitches.find((p) => p.pitchNumber === selectedPitchNumber) ?? null,
    [atBat.pitches, selectedPitchNumber],
  );

  return (
    <Stack gap="md">
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700}>
              {atBat.matchup.batter.fullName} vs {atBat.matchup.pitcher.fullName}
            </Text>
            <Text size="sm" c="dimmed">
              {atBat.about.halfInning === "top" ? "Top" : "Bottom"} {atBat.about.inning} ·{" "}
              {atBat.count.balls}-{atBat.count.strikes}, {atBat.count.outs} out
              {atBat.count.outs === 1 ? "" : "s"}
            </Text>
            <Text mt="xs">{atBat.result.description}</Text>
          </div>
          <Badge color={atBat.result.isOut ? "gray" : "teal"} variant="light">
            {atBat.result.event}
          </Badge>
        </Group>
      </Card>

      <Group align="flex-start" gap="xl" wrap="wrap">
        <StrikeZoneChart
          pitches={atBat.pitches}
          selectedPitchNumber={selectedPitchNumber}
          onSelectPitch={(n) => {
            setSelectedPitchNumber(n);
            setPlaying(false);
          }}
        />

        <Stack gap="sm" style={{ flex: 1, minWidth: 300 }}>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              disabled={!selectedPitch}
              onClick={() => setPlaying(true)}
            >
              Animate pitch
            </Button>
            {selectedPitch ? (
              <Text size="sm" c="dimmed">
                {selectedPitch.details.callDescription}
              </Text>
            ) : null}
          </Group>
          <PitchTrajectoryView
            pitch={selectedPitch}
            playing={playing}
            onPlaybackEnd={() => setPlaying(false)}
          />
        </Stack>
      </Group>

      <ScrollArea.Autosize mah={160}>
        <Group gap="xs">
          {atBat.pitches.map((pitch) => {
            const active = pitch.pitchNumber === selectedPitchNumber;
            return (
              <UnstyledButton
                key={pitch.playId}
                onClick={() => {
                  setSelectedPitchNumber(pitch.pitchNumber);
                  setPlaying(false);
                }}
                style={{
                  border: active
                    ? "1px solid var(--mantine-color-blue-5)"
                    : "1px solid var(--mantine-color-dark-4)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  background: active ? "var(--mantine-color-dark-5)" : "transparent",
                }}
              >
                <Text size="sm" fw={active ? 700 : 500}>
                  #{pitch.pitchNumber} {pitch.details.type ?? "?"}
                </Text>
                <Text size="xs" c="dimmed">
                  {pitch.details.callDescription ?? pitch.details.call}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </ScrollArea.Autosize>
    </Stack>
  );
}

import {
	ActionIcon, Anchor, Group, Paper, Text,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";

/**
 * An app-level notice (S31 `notice-banner`, 438:2959). The action and the ✕ are
 * both optional: the update notice has `Reload` and ✕ (S55 A1: "An update to
 * Baseball Theater is ready."); the offline marker has neither, so it stays
 * while offline (S74 renders it through this component).
 */
export interface Notice
{
	/** Identifies this notice; dismissing hides it until a notice with a new id arrives. */
	id: string;
	message: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	dismissible?: boolean;
}

/** The banner itself: message, an optional Primary text action, an optional ✕. */
export function NoticeBanner({ notice, onDismiss }: {
	notice: Notice;
	onDismiss?: () => void;
})
{
	return (
		<Paper role="status" bg="var(--bt-raised)" radius="md" px="md" py="xs" withBorder>
			<Group justify="space-between" wrap="nowrap" gap="sm">
				<Text size="sm">{notice.message}</Text>
				<Group gap="sm" wrap="nowrap">
					{notice.action ? (
						<Anchor component="button" type="button" size="sm" fw={600} c="var(--bt-primary-light)" onClick={notice.action.onClick}>
							{notice.action.label}
						</Anchor>
					) : null}
					{notice.dismissible && onDismiss ? (
						<ActionIcon variant="subtle" color="gray" aria-label="Dismiss" onClick={onDismiss}>
							<IconX size={16} />
						</ActionIcon>
					) : null}
				</Group>
			</Group>
		</Paper>
	);
}

/**
 * The slot directly under the header (S31 `notice-slot`) that holds at most one
 * notice. It is the only place a notice renders; dismissal lives here so the
 * notice's owner doesn't have to track it.
 */
export function NoticeSlot({ notice }: { notice: Notice | null })
{
	const [dismissedId, setDismissedId] = useState<string | null>(null);
	if (!notice || notice.id === dismissedId) return null;
	return (
		<div data-testid="notice-slot" style={{
			padding: "12px 16px 0",
		}}>
			<NoticeBanner notice={notice} onDismiss={() => setDismissedId(notice.id)} />
		</div>
	);
}

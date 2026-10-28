/**
 * The app's one notice source (S79): whatever should show in the notice slot
 * under the header right now — today the account-deleted notice (A4); the update
 * prompt (S73) and the offline marker (S74) reuse it. Held in memory only, never
 * in browser storage: a reload starts clean, and nothing personal outlives the
 * page. `NoticeProvider.tsx` holds the state; this module holds what callers
 * import, so the provider file exports only a component (fast refresh).
 */
import { createContext, useContext } from "react";
import type { Notice } from "./NoticeSlot.js";

export interface NoticeState
{
	notice: Notice | null;
	show(notice: Notice): void;
}

export const NoticeContext = createContext<NoticeState>({
	notice: null,
	show: () => undefined,
});

/** The current app notice and the way to show one. */
export function useAppNotice(): NoticeState
{
	return useContext(NoticeContext);
}

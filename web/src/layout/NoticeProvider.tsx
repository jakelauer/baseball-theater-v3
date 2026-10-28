import { useState } from "react";
import type { ReactNode } from "react";
import type { Notice } from "./NoticeSlot.js";
import { NoticeContext } from "./notices.js";

/** Holds the app's one notice in memory (`notices.ts`, S79). */
export function NoticeProvider({ children }: { children: ReactNode })
{
	const [notice, setNotice] = useState<Notice | null>(null);
	return (
		<NoticeContext.Provider value={{
			notice,
			show: setNotice,
		}}>
			{children}
		</NoticeContext.Provider>
	);
}

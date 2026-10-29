/**
 * The one-time "was this account just deleted?" answer (S79, S87) as a query, so
 * React's StrictMode double mount and every reader share a single `/api/v1/me`
 * request — the server answers `account_deleted` only once. Not retried (a second
 * request would read the already-cleared cookie), and dropped as soon as nothing
 * reads it, so a later visit to `/settings` asks again and is redirected.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { fetchAccountDeleted } from "./client.js";

const accountDeletedQuery = queryOptions({
	queryKey: ["account-deleted-check"] as const,
	queryFn: fetchAccountDeleted,
	retry: false,
	staleTime: Infinity,
	gcTime: 0,
});

export function useAccountDeleted(): UseQueryResult<boolean, Error>
{
	return useQuery(accountDeletedQuery);
}

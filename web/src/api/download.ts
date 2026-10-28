/**
 * The account's current data download as a resource (S79, ADR-014): one
 * descriptor, one hook, one cache writer. Keyed under `ACCOUNT_QUERY_KEY`, so
 * signing out (or deleting the account, which signs out) drops it with the rest
 * of the account's data; it is never cached anywhere else.
 */
import {
	queryOptions, useQuery, useQueryClient,
} from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { ACCOUNT_QUERY_KEY } from "../session/session.js";
import { fetchCurrentDownload } from "./client.js";

export type CurrentDownload = Awaited<ReturnType<typeof fetchCurrentDownload>>;

const downloadQuery = queryOptions({
	queryKey: [...ACCOUNT_QUERY_KEY, "download"] as const,
	queryFn: (): Promise<CurrentDownload> => fetchCurrentDownload(),
});

/** The current download, or null when there is none (or it aged out). */
export function useCurrentDownload(): UseQueryResult<CurrentDownload, Error>
{
	return useQuery(downloadQuery);
}

/** Puts a just-requested download in the cache, so Settings shows it without asking again. */
export function useWriteCurrentDownload(): (download: CurrentDownload) => void
{
	const client = useQueryClient();
	return (download) => client.setQueryData(downloadQuery.queryKey, download);
}

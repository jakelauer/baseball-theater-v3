/**
 * The schedule-day resource (ADR-014): one descriptor, one hook, one named cache
 * writer. Payload type derived from the S26 route contract, like `game.ts`.
 */
import type { ApiResponseFor } from "@bt/domain";
import {
	queryOptions, useQuery, useQueryClient,
} from "@tanstack/react-query";
import type { QueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchSchedule } from "./client.js";
import { freshnessPolicy } from "./freshness.js";

export type ScheduleDayPayload = ApiResponseFor<"GET /api/v1/schedule">;

/** The cache key for one day. Only this module builds it. */
export function scheduleKey(date: string)
{
	return ["schedule", date] as const;
}

export function scheduleQueryOptions(date: string)
{
	return queryOptions({
		queryKey: scheduleKey(date),
		queryFn: () => fetchSchedule(date),
		staleTime: (query) => freshnessPolicy(query.state.data?.windowMode).staleTime,
		refetchInterval: (query) => freshnessPolicy(query.state.data?.windowMode).refetchInterval,
	});
}

export function useScheduleDay(date: string): UseQueryResult<ScheduleDayPayload, Error>
{
	return useQuery(scheduleQueryOptions(date));
}

/** Write a day into the cache in place — S20's scoreboard refresh calls this. */
export function writeScheduleDay(client: QueryClient, day: ScheduleDayPayload): void
{
	// The descriptor's key carries the payload type, so a wrong-typed write is a type error.
	client.setQueryData(scheduleQueryOptions(day.date).queryKey, day);
}

/** The same writer bound to the mounted client. */
export function useWriteScheduleDay(): (day: ScheduleDayPayload) => void
{
	const client = useQueryClient();
	return (day) => writeScheduleDay(client, day);
}

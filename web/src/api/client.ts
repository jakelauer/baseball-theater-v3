import type { GameSnapshot, ScheduleDay } from "@bt/domain";

async function getJson<T>(path: string): Promise<T>
{
	const res = await fetch(path);
	if (!res.ok)
	{
		throw new Error(`Request failed (${res.status}): ${path}`);
	}
	return (await res.json()) as T;
}

export function fetchSchedule(date: string): Promise<ScheduleDay>
{
	return getJson(`/api/schedule?date=${encodeURIComponent(date)}`);
}

export function fetchGame(gamePk: number): Promise<GameSnapshot>
{
	return getJson(`/api/games/${gamePk}`);
}

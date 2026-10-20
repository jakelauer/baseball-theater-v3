// Stand-in for a @bt/domain type: the rule matches declarations by the
// "/packages/domain/" path segment, which this fixture's path carries.
export type Game = {
	runs: number | null;
	abbreviation: string;
	pitch: { startSpeed: number };
};

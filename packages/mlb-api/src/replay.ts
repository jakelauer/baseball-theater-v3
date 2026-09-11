/**
 * Post-game replay: the timecode diff log MLB publishes for a finished game.
 *
 * `GET /api/v1.1/game/{pk}/feed/live/timestamps` returns every recorded
 * timecode; `GET .../feed/live/diffPatch?startTimecode=&endTimecode=` returns
 * the RFC6902 delta between two of them. Walking the adjacent pairs once, after
 * the game is final, captures the whole game as an ordered patch sequence over
 * a single base feed — replayable later with no live pipeline and no per-viewer
 * MLB egress (ADR-002).
 *
 * This module is pure: types, throwing/zod parsers, and the apply-patch fold
 * that rebuilds feed state. It has no I/O — the capture walk lives in
 * `functions/` because it needs the `MlbStatsClient` port.
 */
import { z } from "zod";

/** One RFC6902 (JSON Patch) operation, as MLB emits them in a diffPatch. */
export interface JsonPatchOp {
	op: "add" | "remove" | "replace" | "move" | "copy" | "test";
	path: string;
	/** Present for `add` / `replace` / `test`. */
	value?: unknown;
	/** JSON pointer source for `move` / `copy`. */
	from?: string;
}

/**
 * Raw `/feed/live/diffPatch` response: MLB wraps the op list in a one-element
 * array (`[{ diff: [...] }]`). An empty `diff` means nothing changed between
 * the two timecodes.
 */
export type GameDiffPatchResponse = Array<{ diff: JsonPatchOp[] }>;

/**
 * One retained step of a recorded walk: the delta between two adjacent
 * timecodes. `rebased` marks the ~15 near-duplicate pairs where MLB returned a
 * full feed instead of a patch and the recorder reduced it to a minimal diff.
 */
export interface ReplayPatchEntry {
	startTimecode: string;
	endTimecode: string;
	diff: JsonPatchOp[];
	rebased?: boolean;
}

/** Feed state rebuilt at one retained timecode. */
export interface ReconstructedState {
	timecode: string;
	feed: unknown;
}

/** Result of folding a walk over a base feed. */
export interface ReplayReconstruction {
	/** End timecodes of the retained (non-empty-diff) steps, in order. */
	timecodes: string[];
	/** Feed state after each retained step. */
	states: ReconstructedState[];
}

const jsonPatchOpSchema = z.object({
	op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
	path: z.string(),
	value: z.unknown().optional(),
	from: z.string().optional(),
});

const gameDiffPatchResponseSchema = z.array(
	z.object({
		diff: z.array(jsonPatchOpSchema),
	}),
);

const replayPatchEntrySchema = z.object({
	startTimecode: z.string(),
	endTimecode: z.string(),
	diff: z.array(jsonPatchOpSchema),
	rebased: z.boolean().optional(),
});

const recordedReplayWalkSchema = z.array(replayPatchEntrySchema);

/** Throwing parser for a raw `/feed/live/diffPatch` response. */
export function parseGameDiffPatchResponse(input: unknown): GameDiffPatchResponse
{
	return gameDiffPatchResponseSchema.parse(input) as GameDiffPatchResponse;
}

/** Throwing parser for a recorded `fixtures/raw/diffpatch-*.json` walk. */
export function parseRecordedReplayWalk(input: unknown): ReplayPatchEntry[]
{
	return recordedReplayWalkSchema.parse(input) as ReplayPatchEntry[];
}

/** Split a JSON pointer into unescaped reference tokens (`""` → root). */
function pointerTokens(pointer: string): string[]
{
	if (pointer === "") return [];
	return pointer
		.split("/")
		.slice(1)
		.map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

type JsonObject = Record<string, unknown>;
type JsonContainer = JsonObject | unknown[];

function step(node: unknown, token: string): unknown
{
	return Array.isArray(node) ? node[Number(token)] : (node as JsonObject)[token];
}

function parentOf(root: unknown, tokens: string[]): JsonContainer
{
	let node: unknown = root;
	for (const token of tokens.slice(0, -1)) node = step(node, token);
	return node as JsonContainer;
}

function readPointer(root: unknown, pointer: string): unknown
{
	let node: unknown = root;
	for (const token of pointerTokens(pointer)) node = step(node, token);
	return node;
}

function insert(parent: JsonContainer, key: string, value: unknown): void
{
	if (Array.isArray(parent))
	{
		if (key === "-") parent.push(value);
		else parent.splice(Number(key), 0, value);
	}
	else
	{
		parent[key] = value;
	}
}

function unset(parent: JsonContainer, key: string): unknown
{
	if (Array.isArray(parent)) return parent.splice(Number(key), 1)[0];
	const held = parent[key];
	delete parent[key];
	return held;
}

/** The feed and every patch value are pure JSON, so a round-trip is a safe deep copy. */
function clone<T>(value: T): T
{
	return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/** Apply one op to `doc` in place. Supports add / remove / replace / move / copy / test. */
function applyOp(doc: unknown, op: JsonPatchOp): void
{
	const tokens = pointerTokens(op.path);
	const key = tokens[tokens.length - 1] ?? "";

	switch (op.op)
	{
		case "add":
			insert(parentOf(doc, tokens), key, clone(op.value));
			return;
		case "replace": {
			const parent = parentOf(doc, tokens);
			if (Array.isArray(parent)) parent[Number(key)] = clone(op.value);
			else parent[key] = clone(op.value);
			return;
		}
		case "remove":
			unset(parentOf(doc, tokens), key);
			return;
		case "move": {
			const fromTokens = pointerTokens(op.from ?? "");
			const held = unset(
				parentOf(doc, fromTokens),
				fromTokens[fromTokens.length - 1] ?? "",
			);
			insert(parentOf(doc, tokens), key, held);
			return;
		}
		case "copy":
			insert(parentOf(doc, tokens), key, clone(readPointer(doc, op.from ?? "")));
			return;
		case "test":
			return;
	}
}

/**
 * Fold `walk` over `baseFeed`, returning the reconstructed feed state at each
 * retained timecode. Empty-diff steps are collapsed — they carry no change — so
 * `states` is shorter than `walk` whenever MLB recorded idle timecodes.
 */
export function reconstructReplay(
	baseFeed: unknown,
	walk: readonly ReplayPatchEntry[],
): ReplayReconstruction
{
	const current = clone(baseFeed);
	const states: ReconstructedState[] = [];

	for (const entry of walk)
	{
		if (entry.diff.length === 0) continue;
		for (const op of entry.diff) applyOp(current, op);
		states.push({
			timecode: entry.endTimecode,
			feed: clone(current),
		});
	}

	return {
		timecodes: states.map((state) => state.timecode),
		states,
	};
}

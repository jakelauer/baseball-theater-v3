/**
 * Serialize a JSON-shaped value with object keys sorted, so two values with the
 * same content always produce the same string whatever order their keys were
 * built in. Follows `JSON.stringify` semantics otherwise: `toJSON` is honored,
 * `undefined` object fields are dropped, and `undefined` in arrays and
 * non-finite numbers become `null`.
 */
function canonical(value: unknown): string
{
	if (value !== null && typeof value === "object" && typeof (value as { toJSON?: unknown }).toJSON === "function")
	{
		return canonical((value as { toJSON: () => unknown }).toJSON());
	}
	if (Array.isArray(value))
	{
		return `[${value.map((item) => (item === undefined ? "null" : canonical(item))).join(",")}]`;
	}
	if (value !== null && typeof value === "object")
	{
		const record = value as Record<string, unknown>;
		const fields = Object.keys(record)
			.filter((key) => record[key] !== undefined)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
		return `{${fields.join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

/**
 * Fingerprint of a JSON-shaped value, independent of object key order (ADR-022).
 *
 * The ingest path compares this against the stored hash to decide "no change":
 * an unchanged poll creates no new version and does not reset the cache
 * lifetime. It is a change detector, not a security hash — 64-bit FNV-1a over
 * the canonical form, pure and synchronous so the same function runs in the
 * Worker, Node tests and the browser without `crypto`. Returns 16 hex chars.
 */
export function contentHash(value: unknown): string
{
	let hash = FNV_OFFSET;
	const text = canonical(value);
	for (let i = 0; i < text.length; i++)
	{
		hash ^= BigInt(text.charCodeAt(i));
		hash = (hash * FNV_PRIME) & MASK_64;
	}
	return hash.toString(16).padStart(16, "0");
}

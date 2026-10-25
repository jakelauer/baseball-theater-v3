// @ts-check
/**
 * `bt/no-browser-storage` — ADR-028, enforced: browser storage (`localStorage`,
 * `sessionStorage`, `indexedDB`, Cache Storage's `caches`) is touched only by
 * `web/src/storage/`, which labels every key as personal or not so sign-out and
 * account deletion can clear all of it. Enabled for `web/src/**` with
 * `web/src/storage/` ignored (`eslint.config.js`), tests included.
 *
 * Reports a reference to one of those globals, whether bare (`localStorage`) or
 * through the global object (`window.localStorage`, `globalThis.caches`). A
 * local variable or property that merely shares the name (`const caches = …`,
 * `config.localStorage`) is not the browser's, so it passes.
 */

const STORAGE_GLOBALS = new Set(["localStorage", "sessionStorage", "indexedDB", "caches"]);
const GLOBAL_OBJECTS = new Set(["window", "globalThis", "self"]);

/** @type {import("eslint").Rule.RuleModule} */
export const noBrowserStorage = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow browser storage outside web/src/storage/, which labels each key for deletion (ADR-028)",
		},
		schema: [],
		messages: {
			storage: "`{{name}}` is browser storage: go through web/src/storage/, which labels each key as personal or not so sign-out and deletion can clear it (ADR-028).",
		},
	},
	create(context)
	{
		return {
			"Program:exit"(node)
			{
				// References that resolve to no declaration in the file are globals.
				for (const ref of context.sourceCode.getScope(node).through)
				{
					if (STORAGE_GLOBALS.has(ref.identifier.name))
					{
						context.report({ node: ref.identifier, messageId: "storage", data: { name: ref.identifier.name } });
					}
				}
			},
			MemberExpression(node)
			{
				const { object, property } = node;
				if (object.type !== "Identifier" || !GLOBAL_OBJECTS.has(object.name)) return;
				const name = property.type === "Identifier" && !node.computed
					? property.name
					: property.type === "Literal" ? String(property.value) : null;
				if (name && STORAGE_GLOBALS.has(name)) context.report({ node, messageId: "storage", data: { name } });
			},
		};
	},
};

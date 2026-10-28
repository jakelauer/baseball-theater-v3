// @ts-check
/**
 * `bt/no-mlb-in-web` — law P3 (docs/v3/LAWS.md; ADR-002): the web app reads BT only;
 * ingest owns every MLB pull. Enabled for `web/**` (`eslint.config.js`). Owner,
 * 2026-10-28: "Yes: P1, P3, P5, P8" (S85).
 *
 * Reports an import of `HttpMlbStatsClient` and any string or template text that
 * names `statsapi.mlb.com`.
 */

const MLB_HOST = "statsapi.mlb.com";

/** @type {import("eslint").Rule.RuleModule} */
export const noMlbInWeb = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow calling MLB from the web app; clients read BT only (ADR-002; law P3)",
		},
		schema: [],
		messages: {
			client: "`HttpMlbStatsClient` talks to MLB: the web app reads BT only (ADR-002, law P3).",
			host: "`statsapi.mlb.com` is MLB: the web app reads BT only (ADR-002, law P3).",
		},
	},
	create(context)
	{
		return {
			ImportSpecifier(node)
			{
				const name = node.imported.type === "Identifier" ? node.imported.name : String(node.imported.value);
				if (name === "HttpMlbStatsClient") context.report({ node, messageId: "client" });
			},
			Literal(node)
			{
				if (typeof node.value === "string" && node.value.includes(MLB_HOST)) context.report({ node, messageId: "host" });
			},
			TemplateElement(node)
			{
				if (node.value.raw.includes(MLB_HOST)) context.report({ node, messageId: "host" });
			},
		};
	},
};

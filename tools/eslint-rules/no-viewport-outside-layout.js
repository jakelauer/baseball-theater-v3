// @ts-check
/**
 * `bt/no-viewport-outside-layout` — law P1 (docs/v3/LAWS.md; ADR-014 rule 8): only
 * the layout host in `web/src/layout/` reads the viewport and hands pages a
 * `variant`; nothing else calls `useMediaQuery` or sets Mantine's `hiddenFrom` /
 * `visibleFrom`. Enabled for `web/src/**` with `web/src/layout/` ignored
 * (`eslint.config.js`), tests included. Owner, 2026-10-28: "Yes: P1, P3, P5, P8" (S85).
 *
 * Reports an import or call of `useMediaQuery` and a JSX `hiddenFrom` /
 * `visibleFrom` attribute. Reduced-motion and other non-viewport media queries go
 * through their own hooks (`useReducedMotion`) and pass.
 */

const RESPONSIVE_PROPS = new Set(["hiddenFrom", "visibleFrom"]);

/** @type {import("eslint").Rule.RuleModule} */
export const noViewportOutsideLayout = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow reading the viewport outside web/src/layout/ (ADR-014 rule 8; law P1)",
		},
		schema: [],
		messages: {
			viewport: "`{{name}}` reads the viewport: only web/src/layout/ may; take the `variant` the layout host passes (ADR-014 rule 8, law P1).",
		},
	},
	create(context)
	{
		return {
			ImportSpecifier(node)
			{
				const name = node.imported.type === "Identifier" ? node.imported.name : String(node.imported.value);
				if (name === "useMediaQuery") context.report({ node, messageId: "viewport", data: { name } });
			},
			CallExpression(node)
			{
				if (node.callee.type === "Identifier" && node.callee.name === "useMediaQuery")
				{
					context.report({ node, messageId: "viewport", data: { name: "useMediaQuery" } });
				}
			},
			JSXAttribute(node)
			{
				const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
				if (name && RESPONSIVE_PROPS.has(name)) context.report({ node, messageId: "viewport", data: { name } });
			},
		};
	},
};

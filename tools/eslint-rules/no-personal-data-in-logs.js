// @ts-check
/**
 * `bt/no-personal-data-in-logs` — law P5 (docs/v3/LAWS.md; ADR-028): no email address
 * or exported personal data reaches a log, where deletion can't follow it. Enabled
 * for `web/src`, `functions/src` and `packages/*\/src`, tests ignored
 * (`eslint.config.js`). Owner, 2026-10-28: "Yes: P1, P3, P5, P8" (S85).
 *
 * Reports a `console.*` call any of whose arguments mentions an identifier or
 * property that names such data: anything containing "email", or `exports`,
 * `exportFor`, `stores`, `download`. A name check, not a data-flow analysis: it
 * catches the direct cases; renaming a value to slip past it defeats the law's
 * purpose and a review should catch that.
 */

const PERSONAL_NAME = /email|^exports?$|^exportFor$|^stores$|^download$/i;

/**
 * The first personal-sounding identifier or property name in an expression, if any.
 * @param {import("estree").Node} node
 * @returns {string | null}
 */
function personalName(node)
{
	switch (node.type)
	{
		case "Identifier": return PERSONAL_NAME.test(node.name) ? node.name : null;
		case "MemberExpression":
			if (node.property.type === "Identifier" && !node.computed && PERSONAL_NAME.test(node.property.name)) return node.property.name;
			return personalName(node.object);
		case "TemplateLiteral": return node.expressions.map(personalName).find(Boolean) ?? null;
		case "ObjectExpression":
			for (const p of node.properties)
			{
				const found = p.type === "Property" ? personalName(p.value) ?? (p.key.type === "Identifier" && PERSONAL_NAME.test(p.key.name) ? p.key.name : null) : personalName(p.argument);
				if (found) return found;
			}
			return null;
		case "CallExpression": return node.arguments.map((a) => personalName(/** @type {import("estree").Node} */ (a))).find(Boolean) ?? null;
		case "BinaryExpression": return personalName(node.left) ?? personalName(node.right);
		default: return null;
	}
}

/** @type {import("eslint").Rule.RuleModule} */
export const noPersonalDataInLogs = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow logging emails or exported personal data (ADR-028; law P5)",
		},
		schema: [],
		messages: {
			personal: "`console.{{method}}` logs `{{name}}`, which names personal data: a log can't be deleted with the account (ADR-028, law P5).",
		},
	},
	create(context)
	{
		return {
			CallExpression(node)
			{
				const { callee } = node;
				if (callee.type !== "MemberExpression" || callee.object.type !== "Identifier" || callee.object.name !== "console") return;
				const method = callee.property.type === "Identifier" ? callee.property.name : "?";
				const name = node.arguments.map((a) => personalName(/** @type {import("estree").Node} */ (a))).find(Boolean);
				if (name) context.report({ node, messageId: "personal", data: { method, name } });
			},
		};
	},
};

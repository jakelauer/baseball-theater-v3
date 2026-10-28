// @ts-check
/**
 * `bt/no-domain-arithmetic` — ADR-025 rule 1, enforced: a value derived from BT
 * data is one named, tested function in `packages/domain`; views only format.
 *
 * Reports `+ - * /` and `Math.*(…)` when an operand is a **number read off a type
 * declared in `packages/domain`** (e.g. `game.linescore.teams.home.runs + 1`,
 * `Math.max(pitch.pitchData.startSpeed, …)`). Strings are not arithmetic, so
 * `abbr + " @ "` passes; so do plain numbers that never came from BT data
 * (layout math, indexes). An operand is unwrapped through `!`, `?.` and the
 * left side of `??` / `||`, since `(runs ?? 0) + 1` is still math on `runs`.
 *
 * Type-aware: needs `parserOptions.projectService` (or `project`). The owning
 * package is decided by the declaring file's path containing `domainPath`
 * (default `/packages/domain/`), so it works for `@bt/domain` imports and for
 * the rule's own test fixtures.
 */
import ts from "typescript";
import { noBrowserStorage } from "./no-browser-storage.js";
import { noMlbInWeb } from "./no-mlb-in-web.js";
import { noPersonalDataInLogs } from "./no-personal-data-in-logs.js";
import { noViewportOutsideLayout } from "./no-viewport-outside-layout.js";

const ARITHMETIC = new Set(["+", "-", "*", "/"]);

/** @type {import("eslint").Rule.RuleModule} */
export const noDomainArithmetic = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow arithmetic over @bt/domain data in views; call a named domain function instead (ADR-025)",
		},
		schema: [
			{
				type: "object",
				properties: { domainPath: { type: "string" } },
				additionalProperties: false,
			},
		],
		messages: {
			arithmetic: "Arithmetic on @bt/domain data (`{{text}}`) belongs in a named, tested function in packages/domain (ADR-025). Call it here and only format the result.",
		},
	},
	create(context)
	{
		const domainPath = context.options[0]?.domainPath ?? "/packages/domain/";
		const services = context.sourceCode.parserServices;
		if (!services?.program || !services.esTreeNodeToTSNodeMap)
		{
			throw new Error("bt/no-domain-arithmetic needs type information (parserOptions.projectService)");
		}
		const checker = services.program.getTypeChecker();

		/** @param {any} node */
		function typeOf(node)
		{
			return checker.getNonNullableType(checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node)));
		}

		/** @param {import("typescript").Type} type */
		function declaredInDomain(type)
		{
			const symbol = type.aliasSymbol ?? type.getSymbol();
			return (symbol?.getDeclarations() ?? []).some((d) => d.getSourceFile().fileName.includes(domainPath));
		}

		/** Strip wrappers that don't change which value is used. @param {any} node */
		function unwrap(node)
		{
			let n = node;
			for (;;)
			{
				if (n.type === "TSNonNullExpression" || n.type === "ChainExpression" || n.type === "TSAsExpression") n = n.expression;
				else if (n.type === "LogicalExpression" && (n.operator === "??" || n.operator === "||")) n = n.left;
				else return n;
			}
		}

		/** A number read off a domain-declared object. @param {any} operand */
		function isDomainNumber(operand)
		{
			const node = unwrap(operand);
			if (node.type !== "MemberExpression") return false;
			if (!(typeOf(node).flags & ts.TypeFlags.NumberLike)) return false;
			return declaredInDomain(typeOf(node.object));
		}

		/** @param {any} node */
		function report(node)
		{
			context.report({
				node,
				messageId: "arithmetic",
				data: { text: context.sourceCode.getText(node) },
			});
		}

		return {
			/** @param {any} node */
			BinaryExpression(node)
			{
				if (!ARITHMETIC.has(node.operator)) return;
				if (isDomainNumber(node.left) || isDomainNumber(node.right)) report(node);
			},
			/** @param {any} node */
			CallExpression(node)
			{
				const callee = node.callee;
				if (callee.type !== "MemberExpression" || callee.object.type !== "Identifier" || callee.object.name !== "Math") return;
				if (node.arguments.some(isDomainNumber)) report(node);
			},
		};
	},
};

/** Local plugin wrapper so `eslint.config.js` can register the rules as `bt/<name>` (laws L1, L2, P1, P3, P5 in docs/v3/LAWS.md). */
export const btRules = {
	rules: {
		"no-domain-arithmetic": noDomainArithmetic,
		"no-browser-storage": noBrowserStorage,
		"no-viewport-outside-layout": noViewportOutsideLayout,
		"no-mlb-in-web": noMlbInWeb,
		"no-personal-data-in-logs": noPersonalDataInLogs,
	},
};

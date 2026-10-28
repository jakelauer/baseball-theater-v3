import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import {
	afterAll, describe, it,
} from "vitest";
import { noViewportOutsideLayout } from "./no-viewport-outside-layout.js";

// RuleTester drives Vitest's own describe/it.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tseslint.parser,
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},
});

const filename = `${import.meta.dirname}/fixtures/view.tsx`;

// Law P1: which files the rule runs on is eslint.config.js's job (web/src/** minus
// web/src/layout/); the layout host's own use is covered there, not here.
ruleTester.run("bt/no-viewport-outside-layout", noViewportOutsideLayout, {
	valid: [
		// A page takes the variant the layout host passes.
		{ code: "export function Page({ variant }: { variant: string }) { return <div data-variant={variant} />; }", filename },
		// Reduced motion is not the viewport.
		{ code: "import { useReducedMotion } from \"@mantine/hooks\";\nexport const r = () => useReducedMotion();", filename },
	],
	invalid: [
		{ code: "import { useMediaQuery } from \"@mantine/hooks\";", filename, errors: [{ messageId: "viewport" }] },
		{ code: "declare function useMediaQuery(q: string): boolean;\nexport const wide = () => useMediaQuery(\"(min-width: 48em)\");", filename, errors: [{ messageId: "viewport" }] },
		{ code: "export const B = () => <button hiddenFrom=\"sm\" />;", filename, errors: [{ messageId: "viewport" }] },
		{ code: "export const B = () => <nav visibleFrom=\"lg\" />;", filename, errors: [{ messageId: "viewport" }] },
	],
});

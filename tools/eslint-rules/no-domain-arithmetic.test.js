import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import {
	afterAll, describe, it,
} from "vitest";
import { noDomainArithmetic } from "./no-domain-arithmetic.js";

// RuleTester drives Vitest's own describe/it.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtures = `${import.meta.dirname}/fixtures`;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tseslint.parser,
		parserOptions: {
			project: "./tsconfig.json",
			tsconfigRootDir: fixtures,
			// With CI=true, typescript-eslint infers a "single run" and builds its program
			// from the files on disk, so RuleTester's in-memory code for fixtures/view.tsx is
			// never type-checked and the rule sees no domain types (CI-only failure, found
			// 2026-10-29 by reproducing CI in Docker). Tests always need the per-file program.
			disallowAutomaticSingleRunInference: true,
		},
	},
});

const header = "import type { Game } from \"./packages/domain/game.js\";\ndeclare const game: Game;\n";
const filename = `${fixtures}/view.tsx`;

ruleTester.run("bt/no-domain-arithmetic", noDomainArithmetic, {
	valid: [
		// Formatting a domain string is not arithmetic.
		{ code: `${header}export const label = game.abbreviation + " @ ";`, filename },
		// Layout math on numbers that never came from BT data.
		{ code: `${header}const width = 12; export const half = width / 2 + Math.max(1, 2);`, filename },
		// Reading a domain number without doing math on it.
		{ code: `${header}export const runs = game.runs ?? "-";`, filename },
	],
	invalid: [
		{ code: `${header}export const next = (game.runs ?? 0) + 1;`, filename, errors: [{ messageId: "arithmetic" }] },
		{ code: `${header}export const mph = Math.round(game.pitch.startSpeed);`, filename, errors: [{ messageId: "arithmetic" }] },
		{ code: `${header}export const doubled = game.runs! * 2;`, filename, errors: [{ messageId: "arithmetic" }] },
	],
});

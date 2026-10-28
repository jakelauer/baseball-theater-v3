import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import {
	afterAll, describe, it,
} from "vitest";
import { noMlbInWeb } from "./no-mlb-in-web.js";

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

// Law P3: the web app reads BT only (ADR-002).
ruleTester.run("bt/no-mlb-in-web", noMlbInWeb, {
	valid: [
		{ code: "export const url = \"/api/v1/schedule\";", filename },
		{ code: "import { fetchSchedule } from \"../api/client.js\";\nexport const f = fetchSchedule;", filename },
	],
	invalid: [
		{ code: "import { HttpMlbStatsClient } from \"@bt/functions\";", filename, errors: [{ messageId: "client" }] },
		{ code: "export const u = \"https://statsapi.mlb.com/api/v1/schedule\";", filename, errors: [{ messageId: "host" }] },
		{ code: "export const u = (d: string) => `https://statsapi.mlb.com/api/v1/schedule?date=${d}`;", filename, errors: [{ messageId: "host" }] },
	],
});

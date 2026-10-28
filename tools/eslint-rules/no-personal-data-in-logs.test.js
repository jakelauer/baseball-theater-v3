import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import {
	afterAll, describe, it,
} from "vitest";
import { noPersonalDataInLogs } from "./no-personal-data-in-logs.js";

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

// Law P5: no email or exported personal data in a log (ADR-028).
ruleTester.run("bt/no-personal-data-in-logs", noPersonalDataInLogs, {
	valid: [
		{ code: "console.info(\"download ready\", downloadId);", filename },
		{ code: "console.error(\"settings save failed\", { status: 500 });", filename },
		{ code: "logger.info(user.email);", filename },
	],
	invalid: [
		{ code: "console.log(user.email);", filename, errors: [{ messageId: "personal" }] },
		{ code: "console.info(`sent to ${account.email}`);", filename, errors: [{ messageId: "personal" }] },
		{ code: "console.warn(\"export\", { stores });", filename, errors: [{ messageId: "personal" }] },
		{ code: "console.log(\"to\", emailAddress);", filename, errors: [{ messageId: "personal" }] },
		{ code: "console.debug(JSON.stringify(exports));", filename, errors: [{ messageId: "personal" }] },
	],
});

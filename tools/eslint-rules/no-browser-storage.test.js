import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import {
	afterAll, describe, it,
} from "vitest";
import { noBrowserStorage } from "./no-browser-storage.js";

// RuleTester drives Vitest's own describe/it.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tseslint.parser,
	},
});

const filename = `${import.meta.dirname}/fixtures/view.tsx`;

ruleTester.run("bt/no-browser-storage", noBrowserStorage, {
	valid: [
		// Going through web/src/storage/ is the point.
		{ code: "import { readStored } from \"../storage/storage.js\";\nexport const token = readStored(\"bt.session\");", filename },
		// A local or a property that shares the name is not the browser's.
		{ code: "const caches = new Map();\nexport const size = caches.size;", filename },
		{ code: "declare const config: { localStorage: boolean };\nexport const on = config.localStorage;", filename },
	],
	invalid: [
		{ code: "export const t = localStorage.getItem(\"bt.session\");", filename, errors: [{ messageId: "storage" }] },
		{ code: "sessionStorage.clear();", filename, errors: [{ messageId: "storage" }] },
		{ code: "export const open = indexedDB.open(\"bt\");", filename, errors: [{ messageId: "storage" }] },
		{ code: "void caches.delete(\"bt\");", filename, errors: [{ messageId: "storage" }] },
		{ code: "window.localStorage.setItem(\"k\", \"v\");", filename, errors: [{ messageId: "storage" }] },
		{ code: "void globalThis[\"caches\"].keys();", filename, errors: [{ messageId: "storage" }] },
	],
});

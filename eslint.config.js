import { createRequire } from "node:module";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

// CJS-only, no "import" export condition — load it the way it actually ships.
const requireExtensions = createRequire(import.meta.url)("eslint-plugin-require-extensions");

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.firebase/**",
      "**/node_modules/**",
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // ESLint owns all TS/JS formatting (tabs, quotes, braces, spacing) — see
    // CLAUDE.md's Code style section. Prettier is not run on these extensions
    // (.prettierignore) because it cannot produce Allman brace placement, and
    // running both would fight over indentation/braces on every commit.
    files: ["**/*.{ts,tsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      // Type-aware linting (needed for no-floating-promises); auto-picks each
      // file's tsconfig across the monorepo rather than one shared project.
      parserOptions: {
        projectService: {
          // Build/test tool configs aren't in any package's tsconfig `include`
          // (allowDefaultProject patterns can't use ** — list each one).
          allowDefaultProject: [
            "vitest.config.ts",
            "eslint.config.js",
            "functions/vitest.config.ts",
            "packages/domain/vitest.config.ts",
            "packages/ports/vitest.config.ts",
            "packages/mlb-api/vitest.config.ts",
            "web/vite.config.ts",
            "web/vitest.config.ts",
            "web/postcss.config.cjs",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@stylistic": stylistic,
      "require-extensions": requireExtensions,
      "unused-imports": unusedImports,
    },
    rules: {
      ...requireExtensions.configs.recommended.rules,
      "no-async-promise-executor": "off",
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": ["error", { checkThenables: true }],
      // Formatting — ESLint's job now, not Prettier's (see file-level comment).
      "@stylistic/indent": ["error", "tab", { SwitchCase: 1 }],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],
      "@stylistic/object-curly-newline": [
        "error",
        {
          ObjectExpression: { multiline: true, minProperties: 1 },
          ObjectPattern: { multiline: true, minProperties: 3 },
          ImportDeclaration: { multiline: true, minProperties: 3 },
          ExportDeclaration: { multiline: true, minProperties: 2 },
        },
      ],
      "@stylistic/object-property-newline": "error",
      "@stylistic/array-bracket-spacing": ["error", "never"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "@stylistic/keyword-spacing": ["error", { before: true, after: true }],
      "@stylistic/arrow-parens": ["error", "always"],
      "@stylistic/max-len": [
        "error",
        { code: 180, ignoreUrls: true, ignoreTemplateLiterals: true, ignoreStrings: true },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);

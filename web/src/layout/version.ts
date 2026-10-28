/**
 * The build's version line, printed at the foot of the nav rail and drawer with
 * no label (S56 A2: "v3.0.0 (c46e853)"; S58 A5). `web/vite.config.ts` injects
 * both parts at build time: the GitHub Actions run number, so every Actions
 * build counts up without a commit to `package.json` (owner, 2026-10-21), and
 * the commit. Builds outside Actions say `dev`; tests, which skip the injection,
 * read `dev (unknown)`.
 */
declare const __BT_BUILD__: string | undefined;
declare const __BT_COMMIT__: string | undefined;

/** `v3.0.{build} ({7-char commit})`. */
export function versionLine(build: string, commit: string): string
{
	return `v3.0.${build} (${commit.slice(0, 7)})`;
}

export const VERSION_LINE = versionLine(
	typeof __BT_BUILD__ === "string" ? __BT_BUILD__ : "dev",
	typeof __BT_COMMIT__ === "string" ? __BT_COMMIT__ : "unknown",
);

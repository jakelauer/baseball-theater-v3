/**
 * The scripts `pnpm verify` reaches (S84, S85): `verify` and every `pnpm <script>` it
 * calls, followed transitively. One implementation for the laws registry test
 * (`laws.test.ts`: an enforced law's step must be in the chain) and law P8
 * (`verify-chain.test.ts`: nothing in the chain starts a browser).
 */
export function verifyChain(scripts: Record<string, string>): Set<string>
{
	const seen = new Set<string>();
	const walk = (name: string): void =>
	{
		if (seen.has(name) || !(name in scripts)) return;
		seen.add(name);
		for (const m of scripts[name]!.matchAll(/pnpm (?:-s )?(?:run )?([a-z][\w:-]*)/g)) walk(m[1]!);
	};
	walk("verify");
	return seen;
}

/** Law P8: the scripts in the verify chain whose command starts a browser (Playwright). */
export function browserSteps(scripts: Record<string, string>): string[]
{
	return [...verifyChain(scripts)].filter((name) => /playwright|design:capture|e2e\//.test(scripts[name]!));
}

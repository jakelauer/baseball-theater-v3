import { Button } from "@mantine/core";
import { useSession } from "./session.js";

/**
 * One-click local sign-in and sign-out as `dev:test-user` (S59). Development
 * builds only: `import.meta.env.PROD` is the constant `true` in a production
 * build, so the bundler drops everything after the check. It's a developer
 * tool with no design; real sign-in is Logto's own screens.
 */
export function DevSessionControl()
{
	const session = useSession();
	if (import.meta.env.PROD || session.status === "loading") return null;
	if (session.status === "signedIn")
	{
		return (
			<Button variant="subtle" size="xs" onClick={session.signOut}>
				Dev sign-out ({session.account.uid})
			</Button>
		);
	}
	return (
		<Button variant="subtle" size="xs" onClick={() => void session.signIn()}>
			Dev sign-in (test-user)
		</Button>
	);
}

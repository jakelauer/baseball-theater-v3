/**
 * The app's single `QueryClient` (ADR-014). Defaults stay deliberately thin:
 * per-resource timing is declared by `freshnessPolicy` in each descriptor, not
 * here, so one global number can never quietly override a resource's policy.
 */
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient
{
	return new QueryClient({
		defaultOptions: {
			queries: {
				// A payload that failed once offline is unlikely to succeed on a retry
				// burst; readers show the error instead of spinning.
				retry: false,
				refetchOnWindowFocus: true,
			},
		},
	});
}

import type { Entitlements, UserProfile } from "@bt/domain";

export type AuthUser = {
	uid: string;
	email: string | null;
};

export interface AuthVerifier {
	verifyBearerToken(authorizationHeader: string | null): Promise<AuthUser | null>;
}

export interface UserRepository {
	getByUid(uid: string): Promise<UserProfile | null>;
	upsert(user: UserProfile): Promise<void>;
	setEntitlements(uid: string, entitlements: Entitlements): Promise<void>;
}

export interface SecretsProvider {
	get(name: string): Promise<string | null>;
}

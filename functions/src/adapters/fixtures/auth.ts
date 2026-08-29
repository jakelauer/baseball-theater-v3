import { entitlementsForTier } from "@bt/domain";
import type { AuthUser, AuthVerifier, SecretsProvider, UserRepository } from "@bt/ports";
import type { UserProfile } from "@bt/domain";

/** Local/dev verifier: Authorization: Bearer local:<uid> or anonymous. */
export class LocalAuthVerifier implements AuthVerifier {
  async verifyBearerToken(authorizationHeader: string | null): Promise<AuthUser | null> {
    if (!authorizationHeader?.startsWith("Bearer ")) return null;
    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (token.startsWith("local:")) {
      return { uid: token.slice("local:".length) || "dev-user", email: "dev@local.test" };
    }
    return null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly byUid = new Map<string, UserProfile>();

  async getByUid(uid: string): Promise<UserProfile | null> {
    return this.byUid.get(uid) ?? null;
  }

  async upsert(user: UserProfile): Promise<void> {
    this.byUid.set(user.uid, user);
  }

  async setEntitlements(
    uid: string,
    entitlements: UserProfile["entitlements"],
  ): Promise<void> {
    const existing = this.byUid.get(uid);
    if (!existing) return;
    this.byUid.set(uid, {
      ...existing,
      entitlements,
      updatedAt: new Date().toISOString(),
    });
  }
}

export class EnvSecretsProvider implements SecretsProvider {
  async get(name: string): Promise<string | null> {
    return process.env[name] ?? null;
  }
}

export function createDevUser(
  uid: string,
  tier: Parameters<typeof entitlementsForTier>[0] = "none",
): UserProfile {
  const now = new Date().toISOString();
  return {
    uid,
    email: `${uid}@local.test`,
    displayName: uid,
    patreonUserId: null,
    entitlements: entitlementsForTier(tier),
    favoriteTeamIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

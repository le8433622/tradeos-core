import { prisma, type OAuthProvider } from "@tradeos/database";
import { encryptToken, decryptToken } from "./oauth-crypto";

export interface StoredOAuthToken {
  id: string;
  organizationId: string;
  provider: OAuthProvider;
  scope: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  providerUserId: string | null;
  providerUsername: string | null;
}

function decryptStored(row: any): StoredOAuthToken {
  return {
    ...row,
    accessToken: decryptToken(row.accessToken),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
  };
}

export async function getOAuthToken(
  organizationId: string,
  provider: OAuthProvider,
): Promise<StoredOAuthToken | null> {
  const row = await prisma.externalOAuthToken.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!row) return null;
  return decryptStored(row);
}

export async function upsertOAuthToken(
  organizationId: string,
  provider: OAuthProvider,
  data: {
    scope: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    providerUserId?: string | null;
    providerUsername?: string | null;
  },
): Promise<StoredOAuthToken> {
  const encrypted = {
    scope: data.scope,
    accessToken: encryptToken(data.accessToken),
    refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : null,
    expiresAt: data.expiresAt ?? null,
    providerUserId: data.providerUserId ?? null,
    providerUsername: data.providerUsername ?? null,
  };
  const row = await prisma.externalOAuthToken.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: { organizationId, provider, ...encrypted },
    update: encrypted,
  });
  return decryptStored(row);
}

export async function deleteOAuthToken(
  organizationId: string,
  provider: OAuthProvider,
): Promise<void> {
  await prisma.externalOAuthToken.delete({
    where: { organizationId_provider: { organizationId, provider } },
  });
}

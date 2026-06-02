import { refreshAccessToken } from "./oauth-ebay";
import { getOAuthToken, upsertOAuthToken } from "./oauth-store";

export interface ResolvedEbayConfig {
  oauthToken: string;
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
  marketplaceId: string;
}

export async function resolveEbayConfig(
  organizationId: string | undefined,
): Promise<ResolvedEbayConfig> {
  const clientId = process.env.EBAY_CLIENT_ID ?? "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET ?? "";
  const sandbox = process.env.EBAY_SANDBOX === "true";

  // Try org-scoped token first
  if (organizationId) {
    const stored = await getOAuthToken(organizationId, "EBAY");
    if (stored) {
      let accessToken = stored.accessToken;

      // Refresh if expired or expiring in 5 min
      if (
        stored.expiresAt &&
        stored.expiresAt.getTime() - Date.now() < 5 * 60 * 1000 &&
        stored.refreshToken
      ) {
        const refreshed = await refreshAccessToken(stored.refreshToken);
        accessToken = refreshed.accessToken;
        await upsertOAuthToken(organizationId, "EBAY", {
          scope: stored.scope,
          accessToken,
          expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          providerUserId: stored.providerUserId,
          providerUsername: stored.providerUsername,
        });
      }

      return {
        oauthToken: accessToken,
        clientId,
        clientSecret,
        sandbox,
        marketplaceId: sandbox ? "EBAY_US" : "EBAY_US",
      };
    }
  }

  // Fallback to env var
  const envToken = process.env.EBAY_OAUTH_TOKEN;
  if (envToken) {
    return {
      oauthToken: envToken,
      clientId,
      clientSecret,
      sandbox,
      marketplaceId: sandbox ? "EBAY_US" : "EBAY_US",
    };
  }

  // No token available — return empty (adapter will return CONFIG_REQUIRED)
  return {
    oauthToken: "",
    clientId,
    clientSecret,
    sandbox,
    marketplaceId: sandbox ? "EBAY_US" : "EBAY_US",
  };
}

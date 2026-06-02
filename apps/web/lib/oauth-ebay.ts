const SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
].join(" ");

function ebayConfig() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const sandbox = process.env.EBAY_SANDBOX === "true";
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set");
  }
  return {
    clientId,
    clientSecret,
    sandbox,
    authUrl: sandbox
      ? "https://auth.sandbox.ebay.com/oauth2/authorize"
      : "https://auth.ebay.com/oauth2/authorize",
    tokenUrl: sandbox
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token",
    redirectUri: `${process.env.APP_URL || "http://localhost:3000"}/api/integrations/ebay/callback`,
  };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getEbayAuthUrl(state: string): string {
  const config = ebayConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: SCOPES,
    state,
  });
  return `${config.authUrl}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  providerUserId?: string;
}

export async function exchangeAuthCode(
  code: string,
): Promise<TokenExchangeResult> {
  const config = ebayConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuthHeader(config.clientId, config.clientSecret)}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `eBay token exchange failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    providerUserId: data.user_id,
  };
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResult> {
  const config = ebayConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES,
  });
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuthHeader(config.clientId, config.clientSecret)}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `eBay token refresh failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getEbayUsername(
  accessToken: string,
): Promise<string | undefined> {
  try {
    const config = ebayConfig();
    const baseUrl = config.sandbox
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";
    const res = await fetch(`${baseUrl}/commerce/identity/v1/user/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.username;
  } catch {
    return undefined;
  }
}

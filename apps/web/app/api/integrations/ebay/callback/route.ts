import { NextResponse } from "next/server";
import { withApiPermission } from "../../../../../lib/api-errors";
import {
  exchangeAuthCode,
  getEbayUsername,
} from "../../../../../lib/oauth-ebay";
import { upsertOAuthToken } from "../../../../../lib/oauth-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=ebay_auth_${error}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=ebay_missing_params", request.url),
    );
  }

  try {
    let statePayload: { organizationId: string };
    try {
      statePayload = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=ebay_invalid_state", request.url),
      );
    }

    const tokenResult = await exchangeAuthCode(code);
    const username = await getEbayUsername(tokenResult.accessToken);

    await upsertOAuthToken(statePayload.organizationId, "EBAY", {
      scope: tokenResult.accessToken.includes("sell.fulfillment")
        ? "browse+orders"
        : "browse",
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000),
      providerUserId: tokenResult.providerUserId,
      providerUsername: username,
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?success=ebay_connected", request.url),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=ebay_exchange_failed&details=${encodeURIComponent(message.slice(0, 100))}`,
        request.url,
      ),
    );
  }
}

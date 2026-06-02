import { NextResponse } from "next/server";
import { withApiPermission } from "../../../../../lib/api-errors";
import { getOAuthToken } from "../../../../../lib/oauth-store";

export async function GET(request: Request) {
  const auth = await withApiPermission(request, "integration.manage");
  if (auth.response) return auth.response;
  const { session } = auth;

  const token = await getOAuthToken(session.organizationId, "EBAY");

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    providerUsername: token.providerUsername,
    scopes: token.scope,
    expiresAt: token.expiresAt?.toISOString() ?? null,
  });
}

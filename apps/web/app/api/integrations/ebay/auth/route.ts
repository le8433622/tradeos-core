import { NextResponse } from "next/server";
import { withApiPermission } from "../../../../../lib/api-errors";
import { getEbayAuthUrl } from "../../../../../lib/oauth-ebay";

export async function GET(request: Request) {
  const auth = await withApiPermission(request, "integration.manage");
  if (auth.response) return auth.response;
  const { session } = auth;

  const state = Buffer.from(
    JSON.stringify({ organizationId: session.organizationId, ts: Date.now() }),
  ).toString("base64url");

  const url = getEbayAuthUrl(state);
  return NextResponse.redirect(url);
}

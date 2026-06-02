import { NextResponse } from "next/server";
import { withApiPermission } from "../../../../../lib/api-errors";
import { deleteOAuthToken } from "../../../../../lib/oauth-store";

export async function DELETE(request: Request) {
  const auth = await withApiPermission(request, "integration.manage");
  if (auth.response) return auth.response;
  const { session } = auth;

  await deleteOAuthToken(session.organizationId, "EBAY");

  return NextResponse.json({ disconnected: true });
}

import { NextResponse } from "next/server";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;
    return NextResponse.json({
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      permissions: session.permissions,
      memberships: session.memberships ?? [],
      email: session.email,
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

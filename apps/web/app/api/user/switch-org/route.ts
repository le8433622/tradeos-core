import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    const hasAccess = session.memberships?.some(
      (m) => m.organizationId === organizationId,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "ORGANIZATION_ACCESS_DENIED" },
        { status: 403 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("activeOrganizationId", organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ organizationId });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

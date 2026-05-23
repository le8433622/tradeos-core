import { NextResponse } from "next/server";
import { approveSnapshot } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../../lib/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "report.approve");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    await approveSnapshot(id, session.organizationId, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    });
    return NextResponse.json({ approved: true });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

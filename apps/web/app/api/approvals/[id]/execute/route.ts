import { NextResponse } from "next/server";
import { executeApprovedRequest } from "@tradeos/approval-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiPermission(request, "approval.execute");
  if (auth.response) return auth.response;
  const { session } = auth;
  const params = await context.params;

  try {
    const approval = await executeApprovedRequest({
      approvalRequestId: params.id,
      organizationId: session.organizationId,
      context: {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        approved: true,
        mfaLevel: session.mfaLevel,
      },
    });
    return NextResponse.json({ approval });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

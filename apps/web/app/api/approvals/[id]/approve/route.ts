import { NextResponse } from "next/server";
import { approveRequest } from "@tradeos/approval-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "approval.execute");
    if (auth.response) return auth.response;
    const { session } = auth;

    const params = await context.params;
    const approval = await approveRequest({
      approvalRequestId: params.id,
      reviewedById: session.userId,
      organizationId: session.organizationId,
      reviewNote: "Approved from TradeOS web console",
    });
    return NextResponse.json({ approval });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

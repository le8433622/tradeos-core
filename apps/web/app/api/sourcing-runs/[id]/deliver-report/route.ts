import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import "@tradeos/sourcing-core";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "sourcing.deliverReport");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const result = await executeAction(
      "sourcing.generateBuyerReport",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ report: result });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

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

    const jsonBody: Record<string, unknown> = await request.json();
    const body = {
      organizationId: session.organizationId,
      sourcingRunId: id,
      summary: (jsonBody.summary as string) ?? "Buyer decision report",
      recommendedSupplierName: jsonBody.recommendedSupplierName as
        | string
        | undefined,
      expectedSavings: jsonBody.expectedSavings
        ? Number(jsonBody.expectedSavings)
        : undefined,
      currency: jsonBody.currency as string | undefined,
      risks: jsonBody.risks as string[] | undefined,
      missingInformation: jsonBody.missingInformation as string[] | undefined,
      nextActions: jsonBody.nextActions as string[] | undefined,
    };

    const result = await executeAction(
      "sourcing.deliverBuyerReport",
      body,
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

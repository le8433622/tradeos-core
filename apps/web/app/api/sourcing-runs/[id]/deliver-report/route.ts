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

    const { searchParams } = new URL(request.url);
    const body = {
      organizationId: session.organizationId,
      sourcingRunId: id,
      summary: searchParams.get("summary") ?? "Buyer decision report",
      recommendedSupplierName: searchParams.get("recommendedSupplierName") ?? undefined,
      expectedSavings: searchParams.get("expectedSavings")
        ? Number(searchParams.get("expectedSavings"))
        : undefined,
      currency: searchParams.get("currency") ?? undefined,
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
    return NextResponse.json({ status: (result as { status: string }).status });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

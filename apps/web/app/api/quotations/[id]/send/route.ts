import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { createApprovalRequest } from "@tradeos/approval-core";
import { getAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import "@tradeos/trade-core";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "quotation.send");
    if (auth.response) return auth.response;
    const { session } = auth;
    const params = await context.params;

    const action = getAction("trade.sendQuotation");
    if (!action) {
      return NextResponse.json({ error: "ACTION_NOT_FOUND" }, { status: 500 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
    });
    if (!quotation) {
      return NextResponse.json(
        { error: "QUOTATION_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (quotation.organizationId !== session.organizationId) {
      return NextResponse.json(
        { error: "ORGANIZATION_ACCESS_DENIED" },
        { status: 403 },
      );
    }

    const approvalRequest = await createApprovalRequest({
      organizationId: session.organizationId,
      requestedById: session.userId,
      actionName: "trade.sendQuotation",
      input: { quotationId: params.id },
      reason: `Send quotation ${params.id} requested by ${session.email}`,
    });

    return NextResponse.json({ approvalRequest }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

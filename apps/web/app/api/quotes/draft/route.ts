import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/quote-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";
import type { UserRole } from "@tradeos/database";

const ALLOWED_ROLES: UserRole[] = ["OWNER", "ADMIN"];

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request, ALLOWED_ROLES);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();

    if (!body.title || !body.supplierName || body.buyPrice === undefined) {
      return NextResponse.json(
        { error: "title, supplierName, and buyPrice are required" },
        { status: 400 },
      );
    }

    const input: Record<string, unknown> = {
      organizationId: session.organizationId,
      title: body.title,
      supplierName: body.supplierName,
      buyPrice: body.buyPrice,
      currency: body.currency || "USD",
      quantity: body.quantity,
      unit: body.unit,
      shippingCost: body.shippingCost,
      handlingCost: body.handlingCost,
      riskBuffer: body.riskBuffer,
      taxOrFee: body.taxOrFee,
      targetMarginPercent: body.targetMarginPercent,
      deliveryEstimate: body.deliveryEstimate,
      refundTerms: body.refundTerms,
      quoteExpiresAt: body.quoteExpiresAt,
      riskNotes: body.riskNotes,
      evidenceIds: body.evidenceIds,
    };
    if (body.sourcingRunId) input.sourcingRunId = body.sourcingRunId;

    const result = await executeAction("quote.draft", input, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { addSupplierAlternativeSchema } from "@tradeos/sourcing-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { stripSessionManagedFields } from "../../../../../lib/validate";
import { z } from "zod";
import "@tradeos/sourcing-core";

const addSupplierAlternativeRequestSchema = addSupplierAlternativeSchema.omit({
  organizationId: true,
  sourcingRunId: true,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "sourcing.manage");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = addSupplierAlternativeRequestSchema.parse(
        await request.json(),
      ) as unknown as Record<string, unknown>;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            error: "VALIDATION_ERROR",
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    body = stripSessionManagedFields(body);
    const result = await executeAction(
      "sourcing.addSupplierAlternative",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
        supplierName: body.supplierName as string,
        supplierCandidateId: body.supplierCandidateId as string | undefined,
        productDescription: body.productDescription as string,
        quantity: body.quantity as string | undefined,
        unit: body.unit as string | undefined,
        unitPrice: body.unitPrice as string | undefined,
        totalCost: body.totalCost as string | undefined,
        currency: body.currency as string | undefined,
        moq: body.moq as string | undefined,
        leadTime: body.leadTime as string | undefined,
        paymentTerm: body.paymentTerm as string | undefined,
        warranty: body.warranty as string | undefined,
        shippingNotes: body.shippingNotes as string | undefined,
        riskFlags: body.riskFlags,
        evidenceId: body.evidenceId as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ alternative: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { submitBuyerDecisionSchema } from "@tradeos/sourcing-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { stripSessionManagedFields } from "../../../../../lib/validate";
import { z } from "zod";
import "@tradeos/sourcing-core";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(
      request,
      "buyerDecision.submit_assigned",
    );
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = submitBuyerDecisionSchema.parse(
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
      "sourcing.submitBuyerDecision",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
        decision: body.decision as string,
        notes: body.notes as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ decision: result }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

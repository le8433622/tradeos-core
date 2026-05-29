import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { recordOutcomeSchema } from "@tradeos/sourcing-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { stripSessionManagedFields } from "../../../../../lib/validate";
import { z } from "zod";
import "@tradeos/sourcing-core";

const recordOutcomeRequestSchema = recordOutcomeSchema.omit({
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
      body = recordOutcomeRequestSchema.parse(
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
      "sourcing.recordOutcome",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
        buyerAction: body.buyerAction as string,
        actualSupplier: body.actualSupplier as string | undefined,
        actualUnitPrice: body.actualUnitPrice as string | undefined,
        actualDeliveryDays: body.actualDeliveryDays as number | undefined,
        qualityResult: body.qualityResult as string | undefined,
        disputeOccurred: body.disputeOccurred as boolean | undefined,
        reorderOccurred: body.reorderOccurred as boolean | undefined,
        buyerSatisfaction: body.buyerSatisfaction as number | undefined,
        learningNote: body.learningNote as string | undefined,
        moneySaved: body.moneySaved as string | undefined,
        timeSaved: body.timeSaved as string | undefined,
        riskReduced: body.riskReduced as string | undefined,
        dependencyReduced: body.dependencyReduced as string | undefined,
        trustImproved: body.trustImproved as string | undefined,
        proofImproved: body.proofImproved as string | undefined,
        buyerUnderstoodReport: body.buyerUnderstoodReport as string | undefined,
        operatorTimeSpent: body.operatorTimeSpent as string | undefined,
        lessonLearned: body.lessonLearned as string | undefined,
        failedOutcomeReason: body.failedOutcomeReason as string | undefined,
        linkedReportId: body.linkedReportId as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ outcome: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

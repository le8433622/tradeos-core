import { NextRequest } from "next/server";
import { z } from "zod";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/crm-core";
import "@tradeos/trade-core";
import { prisma } from "@tradeos/database";
import {
  withApiPermission,
  apiErrorResponse,
} from "../../../../lib/api-errors";
import {
  introductionActionSchema,
  stripSessionManagedFields,
} from "../../../../lib/validate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, response } = await withApiPermission(
      request,
      "introduction.read",
    );
    if (response) return response;

    const intro = await prisma.introductionRequest.findUnique({
      where: { id },
      include: {
        proposerOrg: { select: { id: true, name: true } },
        buyerOrg: {
          select: { id: true, name: true, introductionsEnabled: true },
        },
        sellerOrg: {
          select: { id: true, name: true, introductionsEnabled: true },
        },
      },
    });

    if (!intro) {
      return Response.json(
        { error: "INTRODUCTION_REQUEST_NOT_FOUND" },
        { status: 404 },
      );
    }

    const isParticipant =
      intro.buyerOrgId === session.organizationId ||
      intro.sellerOrgId === session.organizationId ||
      intro.proposerOrgId === session.organizationId;
    if (!isParticipant) {
      return Response.json(
        { error: "ORGANIZATION_ACCESS_DENIED" },
        { status: 403 },
      );
    }

    return Response.json(intro);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session, response } = await withApiPermission(
      request,
      "introduction.propose",
    );
    if (response) return response;

    let body: Record<string, unknown>;
    try {
      body = introductionActionSchema.parse(
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
    const action = body.action as string;
    const note = body.note as string | undefined;
    const contactId = body.contactId as string | undefined;
    const reason = body.reason as string | undefined;
    const valueGenerated = body.valueGenerated as string | undefined;

    let actionName: string;
    let actionInput: Record<string, unknown>;

    switch (action) {
      case "approve":
        actionName = "trade.approveIntroduction";
        actionInput = { introductionId: id, note, contactId };
        break;
      case "reject":
        actionName = "trade.rejectIntroduction";
        actionInput = { introductionId: id, note };
        break;
      case "dispute":
        actionName = "trade.disputeIntroduction";
        actionInput = { introductionId: id, reason };
        break;
      case "report-value":
        actionName = "trade.reportIntroductionValue";
        actionInput = { introductionId: id, valueGenerated };
        break;
      default:
        return Response.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const result = await executeAction(
      actionName,
      {
        ...actionInput,
        organizationId: session.organizationId,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );

    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

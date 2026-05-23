import { NextRequest } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/crm-core";
import "@tradeos/trade-core";
import {
  prisma,
  type Prisma,
  type IntroductionStatus,
} from "@tradeos/database";
import { withApiPermission, apiErrorResponse } from "../../../lib/api-errors";
import {
  proposeIntroductionSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await withApiPermission(
      request,
      "introduction.propose",
    );
    if (response) return response;

    let body: Record<string, unknown>;
    try {
      body = proposeIntroductionSchema.parse(
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
      "trade.proposeIntroduction",
      {
        ...body,
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

    return Response.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withApiPermission(
      request,
      "introduction.read",
    );
    if (response) return response;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const where: Prisma.IntroductionRequestWhereInput = {
      OR: [
        { buyerOrgId: session.organizationId },
        { sellerOrgId: session.organizationId },
        { proposerOrgId: session.organizationId },
      ],
    };
    if (status) where.status = status as IntroductionStatus;

    const introductions = await prisma.introductionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        proposerOrg: { select: { id: true, name: true } },
        buyerOrg: { select: { id: true, name: true } },
        sellerOrg: { select: { id: true, name: true } },
      },
    });

    return Response.json(introductions);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

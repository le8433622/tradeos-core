import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { createSourcingRunSchema } from "@tradeos/sourcing-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import { stripSessionManagedFields } from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/sourcing-core";

const createSourcingRunRequestSchema = createSourcingRunSchema.omit({
  organizationId: true,
});

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "sourcing.list");
    if (auth.response) return auth.response;
    const { session } = auth;

    const runs = await prisma.sourcingRun.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: {
            supplierCandidates: true,
            supplierQuotes: true,
            evidenceItems: true,
            checkpoints: true,
            handovers: true,
          },
        },
      },
    });
    return NextResponse.json({ runs });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "sourcing.create");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createSourcingRunRequestSchema.parse(
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
      "sourcing.createRun",
      {
        organizationId: session.organizationId,
        leadId: body.leadId as string | undefined,
        title: body.title as string,
        requirement: body.requirement as string,
        targetCountry: body.targetCountry as string | undefined,
        sourceCountry: body.sourceCountry as string | undefined,
        productCategory: body.productCategory as string | undefined,
        quantity: body.quantity as string | undefined,
        budget: body.budget as string | undefined,
        currency: body.currency as string | undefined,
        riskLevel: (body.riskLevel as string) ?? "MEDIUM",
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ run: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

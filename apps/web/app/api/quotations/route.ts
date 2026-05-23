import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createQuotationSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/trade-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "quotation.draft");
    if (auth.response) return auth.response;
    const { session } = auth;

    const quotations = await prisma.quotation.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ quotations });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "quotation.draft");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createQuotationSchema.parse(
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
      "trade.draftQuotation",
      {
        organizationId: session.organizationId,
        leadId: body.leadId as string | undefined,
        title: body.title as string,
        requirements: (body.content as string) ?? "",
        currency: (body.currency as string) ?? "USD",
        estimatedAmount: body.totalAmount as number | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ quotation: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

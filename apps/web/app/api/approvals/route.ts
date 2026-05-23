import { NextResponse } from "next/server";
import { createApprovalRequest } from "@tradeos/approval-core";
import { prisma } from "@tradeos/database";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createApprovalSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";
import "@tradeos/trade-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "approval.review");
    if (auth.response) return auth.response;
    const { session } = auth;

    const approvals = await prisma.approvalRequest.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ approvals });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "approval.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createApprovalSchema.parse(
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
    const approval = await createApprovalRequest({
      organizationId: session.organizationId,
      requestedById: session.userId,
      actionName: body.actionName as string,
      input: body.input ?? {},
      reason: body.reason as string | undefined,
    });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

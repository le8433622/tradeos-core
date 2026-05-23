import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createTaskSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";

export async function GET(request: NextRequest) {
  try {
    const auth = await withApiPermission(request, "task.read");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const overdue = searchParams.get("overdue");
    const leadId = searchParams.get("leadId");

    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
    };
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    if (overdue === "true") {
      where.status = { notIn: ["completed", "done"] };
      where.dueAt = { lt: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { assignee: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "task.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createTaskSchema.parse(await request.json()) as unknown as Record<
        string,
        unknown
      >;
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
      "crm.createFollowUpTask",
      {
        organizationId: session.organizationId,
        leadId: body.leadId as string | undefined,
        assigneeId: body.assigneeId as string | undefined,
        title: body.title as string,
        description: body.description as string | undefined,
        dueAt: body.dueAt as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ task: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

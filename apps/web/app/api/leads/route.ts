import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createLeadSchema,
  updateLeadStatusSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "lead.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const leads = await prisma.lead.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ leads });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "lead.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createLeadSchema.parse(await request.json()) as unknown as Record<
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
      "crm.createLead",
      {
        organizationId: session.organizationId,
        source: (body.source as string) ?? "manual",
        name: body.name as string | undefined,
        phone: body.phone as string | undefined,
        email: body.email as string | undefined,
        need: body.need as string | undefined,
        nextAction: body.nextAction as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ lead: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await withApiPermission(request, "lead.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = updateLeadStatusSchema.parse(
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

    const result = await executeAction(
      "crm.updateLeadStatus",
      {
        organizationId: session.organizationId,
        leadId: body.leadId as string,
        status: body.status as string,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ lead: result });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

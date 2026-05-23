import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createCompanySchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "company.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const companies = await prisma.company.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ companies });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "company.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createCompanySchema.parse(
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
      "crm.createCompany",
      {
        organizationId: session.organizationId,
        name: body.name as string,
        country: body.country as string | undefined,
        industry: body.industry as string | undefined,
        type: (body.type as string) ?? "OTHER",
        website: body.website as string | undefined,
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
    return NextResponse.json({ company: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

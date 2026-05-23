import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createContactSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "contact.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const contacts = await prisma.contact.findMany({
      where: { organizationId: session.organizationId },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "contact.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createContactSchema.parse(
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
      "crm.createContact",
      {
        organizationId: session.organizationId,
        companyId: body.companyId as string | undefined,
        name: body.name as string | undefined,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        title: body.title as string | undefined,
        country: body.country as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ contact: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

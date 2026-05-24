import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { addSupplierCandidateSchema } from "@tradeos/sourcing-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { stripSessionManagedFields } from "../../../../../lib/validate";
import { z } from "zod";
import "@tradeos/sourcing-core";

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
      body = addSupplierCandidateSchema.parse(
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
      "sourcing.addSupplierCandidate",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
        name: body.name as string,
        source: body.source as string | undefined,
        website: body.website as string | undefined,
        platform: body.platform as string | undefined,
        country: body.country as string | undefined,
        contactInfo: body.contactInfo,
        reliabilityScore: body.reliabilityScore as number | undefined,
        riskFlags: body.riskFlags,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ candidate: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { z } from "zod";
import "@tradeos/sourcing-core";

const assignSchema = z
  .object({
    sourcingRunId: z.string().min(1),
    assignedToEmail: z.string().email().max(256),
    notes: z.string().max(1024).optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "sourcing.manage");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = assignSchema.parse(await request.json()) as unknown as Record<
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

    const result = await executeAction(
      "sourcing.assignBuyerReport",
      {
        organizationId: session.organizationId,
        sourcingRunId: body.sourcingRunId as string,
        assignedToEmail: body.assignedToEmail as string,
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

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import type { InviteUserInput } from "@tradeos/crm-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";
import {
  createInvitationSchema,
  stripSessionManagedFields,
} from "../../../../lib/validate";
import { z } from "zod";
import "@tradeos/crm-core";

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "user.invite");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createInvitationSchema.parse(
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
    const email = body.email as string;
    const roleId = body.roleId as string | null | undefined;

    const result = await executeAction<
      InviteUserInput,
      { invitationId: string; token: string }
    >(
      "user.invite",
      {
        organizationId: session.organizationId,
        email,
        roleId: roleId || null,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );

    const origin = new URL(request.url).origin;
    const inviteLink = `${origin}/invite/${result.token}`;

    return NextResponse.json(
      { invitation: { id: result.invitationId }, inviteLink },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

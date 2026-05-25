import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";
import "@tradeos/crm-core";

export async function PATCH(request: Request) {
  try {
    const auth = await withApiPermission(request, "privacy.legalHold");
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const legalHold = body.legalHold === true;

    const result = await executeAction(
      "privacy.legalHold",
      {
        organizationId: session.organizationId,
        legalHold,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

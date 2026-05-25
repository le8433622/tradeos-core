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
    if (typeof body.legalHold !== "boolean") {
      return NextResponse.json(
        { error: "INVALID_REQUEST_BODY", message: "legalHold must be a boolean" },
        { status: 400 },
      );
    }
    const legalHold = body.legalHold;

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

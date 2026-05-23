import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "privacy.anonymize");
    if (auth.response) return auth.response;
    const { session } = auth;

    const result = await executeAction(
      "privacy.anonymizePii",
      { organizationId: session.organizationId },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );

    return NextResponse.json({ anonymized: true, result });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { exportTenantData } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "privacy.export");
    if (auth.response) return auth.response;
    const { session } = auth;

    const data = await exportTenantData(session.organizationId, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    });
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

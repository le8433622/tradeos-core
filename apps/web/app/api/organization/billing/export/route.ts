import { NextResponse } from "next/server";
import { exportBillingUsage } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "billing.export");
    if (auth.response) return auth.response;
    const { session } = auth;

    const data = await exportBillingUsage(session.organizationId, {
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

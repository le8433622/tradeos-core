import { NextResponse } from "next/server";
import { getBillingMetrics } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "billing.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const metrics = await getBillingMetrics(session.organizationId);
    return NextResponse.json({ metrics });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

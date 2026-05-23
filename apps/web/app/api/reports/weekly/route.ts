import { NextResponse } from "next/server";
import { generateWeeklyReport } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "report.generate");
    if (auth.response) return auth.response;
    const { session } = auth;

    const report = await generateWeeklyReport(session.organizationId);
    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

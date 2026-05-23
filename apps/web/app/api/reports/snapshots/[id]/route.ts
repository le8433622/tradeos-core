import { NextResponse } from "next/server";
import { getSnapshot } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "report.generate");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const snapshot = await getSnapshot(id, session.organizationId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

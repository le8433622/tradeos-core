import { NextResponse } from "next/server";
import { createWeeklySnapshot, listSnapshots } from "@tradeos/analytics-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "report.generate");
    if (auth.response) return auth.response;
    const { session } = auth;

    const snapshots = await listSnapshots(session.organizationId);
    return NextResponse.json({ snapshots });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "report.generate");
    if (auth.response) return auth.response;
    const { session } = auth;

    const snapshot = await createWeeklySnapshot(session.organizationId, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

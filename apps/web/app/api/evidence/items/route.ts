import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "evidence.upload");
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const {
      sourcingRunId,
      evidenceType,
      title,
      description,
      content,
      metadata,
    } = body;

    if (!sourcingRunId || !evidenceType || !title) {
      return NextResponse.json(
        { error: "sourcingRunId, evidenceType, and title are required" },
        { status: 400 },
      );
    }

    const result = await executeAction(
      "evidence.createItem",
      {
        organizationId: session.organizationId,
        sourcingRunId,
        relatedType: "SOURCING_RUN",
        evidenceType,
        title,
        description: description ?? "",
        content: content ?? "",
        metadata: metadata ?? null,
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

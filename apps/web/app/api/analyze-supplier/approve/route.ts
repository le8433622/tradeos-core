import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId is required" },
        { status: 400 },
      );
    }

    // Find the evidence item
    const evidence = await prisma.evidenceItem.findUnique({
      where: { id: analysisId },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 },
      );
    }

    if (evidence.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update with approval info
    let content = {};
    try {
      content =
        typeof evidence.content === "string"
          ? JSON.parse(evidence.content)
          : evidence.content || {};
    } catch {
      content = { rawContent: evidence.content };
    }

    const updatedContent = {
      ...content,
      humanApproved: true,
      approvedBy: session.userId,
      approvedAt: new Date().toISOString(),
      role: session.role,
    };

    await prisma.evidenceItem.update({
      where: { id: analysisId },
      data: {
        content: JSON.stringify(updatedContent),
        evidenceType: "APPROVAL_RECORD",
        metadata: {
          ...(typeof evidence.metadata === "object" ? evidence.metadata : {}),
          humanApproved: true,
          approvedBy: session.userId,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: analysisId,
      approved: true,
      approvedBy: session.userId,
      message: "Analysis approved and saved to evidence ledger.",
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

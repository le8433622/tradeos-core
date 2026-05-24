import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "sourcing.view");
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    const run = await prisma.sourcingRun.findUnique({
      where: { id },
      include: {
        supplierCandidates: {
          orderBy: { createdAt: "desc" },
        },
        supplierQuotes: {
          orderBy: { comparisonRank: "asc" },
          include: {
            supplierCandidate: { select: { name: true } },
          },
        },
        evidenceItems: {
          orderBy: { capturedAt: "desc" },
          select: {
            id: true,
            evidenceType: true,
            title: true,
            capturedAt: true,
          },
        },
        checkpoints: {
          orderBy: { createdAt: "asc" },
        },
        handovers: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "SOURCING_RUN_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (run.organizationId !== session.organizationId) {
      return NextResponse.json(
        { error: "ORGANIZATION_ACCESS_DENIED" },
        { status: 403 },
      );
    }

    return NextResponse.json({ run });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "sourcing.create");
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const {
      evidenceItemId,
      title,
      requirement,
      sourceCountry,
      targetCountry,
      productCategory,
      quantity,
      budget,
      currency,
    } = body;

    if (!title || !requirement) {
      return NextResponse.json(
        { error: "title and requirement are required" },
        { status: 400 },
      );
    }

    if (evidenceItemId) {
      const evidence = await prisma.evidenceItem.findFirst({
        where: { id: evidenceItemId, organizationId: session.organizationId },
        select: { id: true },
      });
      if (!evidence) {
        return NextResponse.json(
          { error: "EVIDENCE_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    const result = (await executeAction(
      "sourcing.createRun",
      {
        organizationId: session.organizationId,
        title,
        requirement,
        sourceCountry: sourceCountry || undefined,
        targetCountry: targetCountry || undefined,
        productCategory: productCategory || undefined,
        quantity: quantity || undefined,
        budget: budget || undefined,
        currency: currency || undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    )) as { id: string; status: string };

    if (evidenceItemId) {
      await executeAction(
        "evidence.attachToRun",
        {
          organizationId: session.organizationId,
          evidenceId: evidenceItemId,
          sourcingRunId: result.id,
        },
        {
          actorUserId: session.userId,
          organizationId: session.organizationId,
          role: session.role,
          source: "manual",
          mfaLevel: session.mfaLevel,
        },
      );
    }

    return NextResponse.json({ id: result.id, status: result.status });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

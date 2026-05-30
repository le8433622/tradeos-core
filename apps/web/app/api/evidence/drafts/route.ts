import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/evidence-core";
import "@tradeos/sourcing-core";
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
      supplierName,
      painFlags,
      dependencyFlags,
      suggestedReason,
      suggestedNextStep,
      overrideReason,
      requiredProof,
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

    // --- Operator review enforcement ---

    if (!suggestedNextStep) {
      return NextResponse.json(
        { error: "suggestedNextStep is required" },
        { status: 400 },
      );
    }

    if (
      suggestedNextStep === "NEEDS_MORE_EVIDENCE" &&
      !overrideReason?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Evidence too weak. Enter override reason explaining why this case should proceed despite weak evidence.",
        },
        { status: 400 },
      );
    }

    const hasSupplierName =
      typeof supplierName === "string" && supplierName.trim().length > 0;

    if (
      suggestedNextStep === "NEEDS_SUPPLIER_IDENTITY" &&
      !hasSupplierName &&
      !overrideReason?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Supplier identity is missing. Provide a supplier or enter override reason explaining why to proceed without supplier identity.",
        },
        { status: 400 },
      );
    }

    // --- Build runInput ---

    const step = suggestedNextStep as string;
    let reviewState: string | undefined;
    if (step === "REQUEST_MORE_EVIDENCE") {
      reviewState = "PROOF_PENDING";
    } else if (step === "NEEDS_SUPPLIER_IDENTITY" && overrideReason?.trim()) {
      reviewState = "SUPPLIER_IDENTITY_PENDING";
    } else if (step === "WAIT") {
      reviewState = "WAIT";
    }

    const metadata: Record<string, unknown> = {
      painCategories: Array.isArray(painFlags) ? painFlags : undefined,
      dependencyFlags: Array.isArray(dependencyFlags)
        ? dependencyFlags
        : undefined,
      painDetail: suggestedReason || undefined,
      reviewState: reviewState ?? undefined,
      overrideReason: overrideReason?.trim() || undefined,
      requiredProof: Array.isArray(requiredProof) ? requiredProof : undefined,
      suggestedNextStep: step,
      supplierProvided: hasSupplierName || undefined,
    };

    const runInput: Record<string, unknown> = {
      organizationId: session.organizationId,
      title,
      requirement,
      sourceCountry: sourceCountry || undefined,
      targetCountry: targetCountry || undefined,
      productCategory: productCategory || undefined,
      quantity: quantity || undefined,
      budget: budget || undefined,
      currency: currency || undefined,
      metadata,
    };

    const result = (await executeAction("sourcing.createRun", runInput, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    })) as { id: string; status: string };

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

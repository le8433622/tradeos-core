import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { prisma } from "@tradeos/database";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import "@tradeos/sourcing-core";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "sourcing.manage");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const result = await executeAction(
      "sourcing.generateSwitchDecision",
      {
        organizationId: session.organizationId,
        sourcingRunId: id,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ report: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(_request, "sourcing.view");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const raw = await prisma.switchDecisionReport.findFirst({
      where: {
        sourcingRunId: id,
        organizationId: session.organizationId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!raw) {
      return NextResponse.json({ report: null });
    }

    const report = {
      id: raw.id,
      recommendation: raw.recommendation,
      confidence: raw.confidence,
      savingsScore: raw.savingsScore ?? 0,
      evidenceScore: raw.evidenceScore ?? 0,
      paymentRiskScore: raw.paymentRiskScore ?? 0,
      leadTimeRiskScore: raw.leadTimeRiskScore ?? 0,
      dependencyRiskScore: raw.dependencyRiskScore ?? 0,
      overallScore: raw.overallScore ?? 0,
      monthlySavings: raw.monthlySavings ? Number(raw.monthlySavings) : null,
      annualSavings: raw.annualSavings ? Number(raw.annualSavings) : null,
      savingsPercent: raw.savingsPercent
        ? Math.round(Number(raw.savingsPercent) * 100) / 100
        : null,
      currency: raw.currency,
      evidenceCount:
        (raw.evidenceSummary as { count?: number } | null)?.count ?? 0,
      missingProof: Array.isArray(raw.missingProof)
        ? (raw.missingProof as string[])
        : [],
      riskFlags: Array.isArray(raw.riskFlags)
        ? (raw.riskFlags as string[])
        : [],
      summary: raw.summary ?? "",
      nextActions: Array.isArray(raw.nextActions)
        ? (raw.nextActions as string[])
        : [],
    };

    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(_request, error);
  }
}

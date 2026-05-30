import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/evidence-core";
import "@tradeos/sourcing-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";
import type { UserRole } from "@tradeos/database";

type SearchResultPayload = {
  intent: Record<string, unknown>;
  candidates: Record<string, unknown>[];
  suppliers?: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  simulation: Record<string, unknown>;
  providerUsed: string;
};

type AttachBody = {
  searchResult: SearchResultPayload;
  candidateIndex: number;
  sourcingRunId?: string;
  createNewRun?: boolean;
  newRunTitle?: string;
  newRunRequirement?: string;
};

const ALLOWED_ROLES: UserRole[] = ["OWNER", "ADMIN", "OPERATOR"];

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request, ALLOWED_ROLES);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body: AttachBody = await request.json();

    if (!body.searchResult) {
      return NextResponse.json(
        { error: "searchResult is required" },
        { status: 400 },
      );
    }

    if (body.candidateIndex === undefined || body.candidateIndex < 0) {
      return NextResponse.json(
        { error: "candidateIndex is required" },
        { status: 400 },
      );
    }

    if (body.sourcingRunId && body.createNewRun) {
      return NextResponse.json(
        { error: "Cannot specify both sourcingRunId and createNewRun" },
        { status: 400 },
      );
    }

    const { candidates, evidence, simulation, intent, providerUsed } =
      body.searchResult;

    if (body.candidateIndex >= candidates.length) {
      return NextResponse.json(
        { error: "candidateIndex out of range" },
        { status: 400 },
      );
    }

    const candidate = candidates[body.candidateIndex];
    const candidateEvidence = evidence[body.candidateIndex];

    const recommendations = (simulation as Record<string, unknown>)
      .recommendations as Record<string, unknown>[] | undefined;

    const recommendation = recommendations?.find(
      (r) =>
        (r.candidate as Record<string, unknown>)?.externalId ===
        candidate.externalId,
    );

    const title = `Product Search: ${String(candidate.title ?? "Unknown")}`;
    const description = [
      `Source: ${providerUsed}`,
      candidate.price
        ? `Price: ${String(candidate.price)} ${String(candidate.currency ?? "")}`
        : null,
      candidate.sellerName ? `Seller: ${String(candidate.sellerName)}` : null,
      recommendation
        ? `Recommendation: ${String(recommendation.recommendation)}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const evidenceMetadata = {
      productSearch: {
        provider: providerUsed,
        intent,
        candidateEvidence,
        recommendation: recommendation ?? null,
        originalSearch: {
          candidatesCount: candidates.length,
          simulation,
        },
      },
    };

    const evidenceInput: Record<string, unknown> = {
      organizationId: session.organizationId,
      relatedType: "SOURCING_RUN",
      evidenceType: "MARKET_BENCHMARK",
      title,
      description,
      content: JSON.stringify({ candidate, candidateEvidence, recommendation }),
      metadata: evidenceMetadata,
    };

    if (body.sourcingRunId) {
      evidenceInput.sourcingRunId = body.sourcingRunId;
    }

    const evidenceResult = (await executeAction(
      "evidence.createItem",
      evidenceInput,
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    )) as { id: string };

    let sourcingRunId: string | null = body.sourcingRunId ?? null;

    if (body.createNewRun) {
      const runTitle =
        body.newRunTitle ||
        `Sourcing: ${String(candidate.title ?? "Product Search")}`;
      const runRequirement =
        body.newRunRequirement ||
        `Product search for "${String((intent as Record<string, unknown>)?.query ?? candidate.title)}". Selected candidate: ${String(candidate.title)}`;

      const intentData = intent as Record<string, unknown>;

      const runInput: Record<string, unknown> = {
        organizationId: session.organizationId,
        title: runTitle,
        requirement: runRequirement,
        quantity:
          intentData.quantity != null ? String(intentData.quantity) : undefined,
        budget:
          intentData.budgetMax != null
            ? String(intentData.budgetMax)
            : intentData.budget != null
              ? String(intentData.budget)
              : undefined,
        currency:
          (candidate.currency as string) ||
          (intentData.currency as string) ||
          undefined,
        metadata: {
          evidenceSummary: [
            `Product search: ${String(intentData.query ?? "")}`,
            `Provider: ${providerUsed}`,
            recommendation
              ? `Recommendation: ${String((recommendation as Record<string, unknown>).recommendation)}`
              : null,
            `Selected: ${String(candidate.title)}`,
          ]
            .filter(Boolean)
            .join(" | "),
          painCategories: (candidateEvidence as Record<string, unknown>)
            ?.missingProofFlags as string[] | undefined,
        },
      };

      const runResult = (await executeAction("sourcing.createRun", runInput, {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      })) as { id: string; status: string };

      sourcingRunId = runResult.id;

      await executeAction(
        "evidence.attachToRun",
        {
          organizationId: session.organizationId,
          evidenceId: evidenceResult.id,
          sourcingRunId: runResult.id,
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

    return NextResponse.json({
      evidenceItemId: evidenceResult.id,
      sourcingRunId,
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

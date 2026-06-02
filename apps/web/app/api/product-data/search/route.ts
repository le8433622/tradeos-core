import { NextResponse } from "next/server";
import {
  MockProductDataAdapter,
  EbayBrowseAdapter,
  parseProductSearchIntent,
  productCandidateToEvidence,
  simulateProductScenarios,
  rankCandidates,
  type ProductDataAdapter,
  type ProductSearchIntent,
} from "@tradeos/product-data-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";
import { resolveEbayConfig } from "../../../../lib/oauth-ebay-adapter";
import type { UserRole } from "@tradeos/database";

type SearchProvider = "auto" | "ebay" | "mock";

type SearchBody = {
  text?: string;
  intent?: Partial<ProductSearchIntent>;
  provider?: SearchProvider;
};

const ALLOWED_ROLES: UserRole[] = ["OWNER", "ADMIN", "OPERATOR"];

async function selectAdapter(
  provider: SearchProvider,
  organizationId?: string,
): Promise<{
  adapter: ProductDataAdapter;
  warnings: string[];
}> {
  if (provider === "mock") {
    return { adapter: new MockProductDataAdapter(), warnings: [] };
  }

  const cfg = await resolveEbayConfig(organizationId);

  if (provider === "ebay") {
    return { adapter: new EbayBrowseAdapter(cfg), warnings: [] };
  }

  if (cfg.oauthToken) {
    return { adapter: new EbayBrowseAdapter(cfg), warnings: [] };
  }
  return {
    adapter: new MockProductDataAdapter(),
    warnings: ["eBay token not configured. Falling back to mock data."],
  };
}

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request, ALLOWED_ROLES);
    if (auth.response) return auth.response;

    const body: SearchBody = await request.json();
    const text = body.text ?? "";

    if (!text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const intent = parseProductSearchIntent(text, body.intent);
    const { adapter, warnings: adapterWarnings } = await selectAdapter(
      body.provider ?? "auto",
      auth.session.organizationId,
    );

    const result = await adapter.search(intent);
    const evidence = result.candidates.map((c) =>
      productCandidateToEvidence(c),
    );
    const simulation = simulateProductScenarios(
      intent,
      result.candidates,
      result.suppliers,
    );

    const ranking = rankCandidates(result.candidates, intent);

    return NextResponse.json({
      intent,
      providerUsed: adapter.provider,
      candidates: result.candidates,
      evidence,
      simulation,
      ranking: {
        scored: ranking.ranked.map((c) => ({
          externalId: c.externalId,
          relevanceScore: c.relevanceScore,
          axisScores: c.axisScores,
          summary: c.summary,
          valueLabel: c.valueLabel,
        })),
        topPick: ranking.topPick?.externalId ?? null,
        bestPrice: ranking.bestPrice?.externalId ?? null,
        premiumPick: ranking.premiumPick?.externalId ?? null,
        marketInsights: ranking.marketInsights,
      },
      warnings: [
        ...adapterWarnings,
        ...result.warnings,
        ...ranking.marketInsights.warnings,
      ],
      missingData: result.missingData,
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { NextResponse } from "next/server";
import {
  MockProductDataAdapter,
  EbayBrowseAdapter,
  parseProductSearchIntent,
  productCandidateToEvidence,
  simulateProductScenarios,
  type ProductDataAdapter,
  type ProductSearchIntent,
} from "@tradeos/product-data-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";
import type { UserRole } from "@tradeos/database";

type SearchProvider = "auto" | "ebay" | "mock";

type SearchBody = {
  text?: string;
  intent?: Partial<ProductSearchIntent>;
  provider?: SearchProvider;
};

const ALLOWED_ROLES: UserRole[] = ["OWNER", "ADMIN", "OPERATOR"];

function selectAdapter(provider: SearchProvider): {
  adapter: ProductDataAdapter;
  warnings: string[];
} {
  if (provider === "mock") {
    return { adapter: new MockProductDataAdapter(), warnings: [] };
  }

  const cfg = {
    oauthToken: process.env.EBAY_OAUTH_TOKEN,
    clientId: process.env.EBAY_CLIENT_ID,
    clientSecret: process.env.EBAY_CLIENT_SECRET,
    sandbox: process.env.EBAY_SANDBOX === "true",
  };

  if (provider === "ebay") {
    return { adapter: new EbayBrowseAdapter(cfg), warnings: [] };
  }

  if (cfg.oauthToken || (cfg.clientId && cfg.clientSecret)) {
    return { adapter: new EbayBrowseAdapter(cfg), warnings: [] };
  }
  return {
    adapter: new MockProductDataAdapter(),
    warnings: ["EBAY_OAUTH_TOKEN not configured. Falling back to mock data."],
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
    const { adapter, warnings: adapterWarnings } = selectAdapter(
      body.provider ?? "auto",
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

    return NextResponse.json({
      intent,
      providerUsed: adapter.provider,
      candidates: result.candidates,
      evidence,
      simulation,
      warnings: [...adapterWarnings, ...result.warnings],
      missingData: result.missingData,
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

import { describe, expect, it } from "vitest";
import {
  normalizeEbayItemSummary,
  normalizeEbayItemSummaries,
  EbayBrowseAdapter,
} from "../ebay-adapter";
import {
  productCandidateToEvidence,
  simulateProductScenarios,
  type ProductSearchIntent,
} from "../index";
import ebayFixture from "./fixtures/ebay-item-summary.json";

function intent(
  overrides: Partial<ProductSearchIntent> = {},
): ProductSearchIntent {
  return {
    query: "welding robot",
    currency: "VND",
    budgetMax: 100_000_000,
    quantity: 12,
    requiredSpecs: [],
    avoidSpecs: [],
    buyerUseCase: "factory procurement",
    urgency: "MEDIUM",
    riskTolerance: "MEDIUM",
    ...overrides,
  };
}

describe("EbayBrowseAdapter — config missing", () => {
  it("returns CONFIG_REQUIRED when no oauthToken is provided", async () => {
    const adapter = new EbayBrowseAdapter();
    const result = await adapter.search(intent());

    expect(result.candidates).toEqual([]);
    expect(result.suppliers).toEqual([]);
    expect(result.warnings[0]).toContain("CONFIG_REQUIRED");
    expect(result.missingData).toContain("CONFIG_REQUIRED");
    expect(result.providerMeta.configMissing).toBe(true);
  });
});

describe("normalizeEbayItemSummary", () => {
  it("normalizes a complete eBay item summary into ProductCandidate", () => {
    const item = ebayFixture.itemSummaries[0]!;
    const candidate = normalizeEbayItemSummary(item);

    expect(candidate.provider).toBe("ebay");
    expect(candidate.externalId).toBe("v1|394817203948|0");
    expect(candidate.title).toBe(
      "Industrial Welding Robot Automatic CNC Controller 6-Axis Arm 220V 3KW",
    );
    expect(candidate.url).toBe("https://www.ebay.com/itm/394817203948");
    expect(candidate.imageUrl).toBe(
      "https://i.ebayimg.com/images/g/test123/s-l500.jpg",
    );
    expect(candidate.price).toBe(2850);
    expect(candidate.currency).toBe("USD");
    expect(candidate.condition).toBe("New");
    expect(candidate.sellerName).toBe("robotics-supplier");
    expect(candidate.sellerCountry).toBe("CN");
    expect(candidate.shippingCost).toBe(150);
    expect(candidate.deliveryEstimate).toContain("Estimated between");
    expect(candidate.rating).toBeCloseTo(4.96, 1);
    expect(candidate.reviewCount).toBe(5876);
    expect(candidate.raw).toBe(item);
  });

  it("handles item missing price gracefully", () => {
    const item = ebayFixture.itemSummaries[1]!;
    const candidate = normalizeEbayItemSummary(item);

    expect(candidate.price).toBeUndefined();
    expect(candidate.sellerName).toBe("factory-direct-cn");
    expect(candidate.sellerCountry).toBe("CN");
    expect(candidate.shippingCost).toBe(0);
  });

  it("handles item missing seller info gracefully", () => {
    const item = ebayFixture.itemSummaries[2]!;
    const candidate = normalizeEbayItemSummary(item);

    expect(candidate.price).toBeUndefined();
    expect(candidate.currency).toBeUndefined();
    expect(candidate.sellerName).toBe("liquidation-seller-88");
    expect(candidate.sellerCountry).toBe("US");
    expect(candidate.rating).toBeUndefined();
    expect(candidate.reviewCount).toBeUndefined();
    expect(candidate.condition).toBe("Used");
  });

  it("normalizes empty list", () => {
    const candidates = normalizeEbayItemSummaries([]);
    expect(candidates).toEqual([]);
  });
});

describe("normalizeEbayItemSummaries", () => {
  it("normalizes all items from the fixture", () => {
    const candidates = normalizeEbayItemSummaries(
      ebayFixture.itemSummaries ?? [],
    );

    expect(candidates).toHaveLength(3);
    expect(candidates[0]!.externalId).toBe("v1|394817203948|0");
    expect(candidates[1]!.externalId).toBe("v1|887654321098|0");
    expect(candidates[2]!.externalId).toBe("v1|555123456789|0");
  });
});

describe("EbayBrowseAdapter — evidence conversion", () => {
  it("converts an eBay-normalized candidate into ProductEvidence", () => {
    const item = ebayFixture.itemSummaries[0]!;
    const candidate = normalizeEbayItemSummary(item);
    const evidence = productCandidateToEvidence(candidate);

    expect(evidence.sourceProvider).toBe("ebay");
    expect(evidence.productTitle).toContain("Welding Robot");
    expect(evidence.price).toBe(2850);
    expect(evidence.currency).toBe("USD");
    expect(evidence.sellerName).toBe("robotics-supplier");
    expect(evidence.sellerCountry).toBe("CN");
    expect(evidence.evidenceQuality).toBe("L3_SELLER_IDENTIFIED");
    expect(evidence.missingProofFlags).not.toContain("NEEDS_PRICE");
    expect(evidence.missingProofFlags).toContain("NEEDS_VERIFICATION");
    expect(evidence.raw).toBe(item);
  });

  it("eBay candidate only with title falls to L1_API_LISTING", () => {
    const candidate = normalizeEbayItemSummary({
      itemId: "v1|test-no-seller-no-price|0",
      title: "Some machine without price or seller",
    });
    const evidence = productCandidateToEvidence(candidate);

    expect(evidence.evidenceQuality).toBe("L1_API_LISTING");
    expect(evidence.missingProofFlags).toContain("NEEDS_PRICE");
    expect(evidence.missingProofFlags).toContain("NEEDS_SUPPLIER_IDENTITY");
  });

  it("eBay candidate with seller username qualifies as L3_SELLER_IDENTIFIED", () => {
    const candidate = normalizeEbayItemSummary({
      itemId: "v1|test-seller-identified|0",
      title: "CNC Machine with price and seller username",
      price: { value: "5000.00", currency: "USD" },
      seller: { username: "known-seller-123" },
    });
    const evidence = productCandidateToEvidence(candidate);

    expect(evidence.evidenceQuality).toBe("L3_SELLER_IDENTIFIED");
    expect(evidence.sellerName).toBe("known-seller-123");
    expect(evidence.price).toBe(5000);
    expect(evidence.missingProofFlags).toContain("NEEDS_VERIFICATION");
  });
});

describe("EbayBrowseAdapter — simulator integration", () => {
  it("simulator can consume eBay-normalized candidate and return recommendation", () => {
    const candidates = normalizeEbayItemSummaries(
      ebayFixture.itemSummaries ?? [],
    );

    const simulation = simulateProductScenarios(
      intent({ budgetMax: 100_000_000, currency: "USD" }),
      candidates,
    );

    expect(simulation.recommendations.length).toBeGreaterThan(0);
    expect(simulation.recommendations[0]?.candidate.provider).toBe("ebay");
  });

  it("eBay candidate with full data can score BEST_MATCH", () => {
    const item = ebayFixture.itemSummaries[0]!;
    const candidate = normalizeEbayItemSummary(item);

    const simulation = simulateProductScenarios(
      intent({
        budgetMax: 4000,
        currency: "USD",
        requiredSpecs: ["automatic", "industrial"],
        riskTolerance: "MEDIUM",
      }),
      [candidate],
    );

    const best = simulation.recommendations[0]!;
    expect(best.candidate.externalId).toBe("v1|394817203948|0");
    expect(best.recommendation).toBe("BEST_MATCH");
    expect(best.score.total).toBeGreaterThanOrEqual(70);
  });
});

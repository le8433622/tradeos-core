import { describe, it, expect } from "vitest";
import { scoreCandidate, rankCandidates } from "../scoring";
import type { ProductCandidate, ProductSearchIntent } from "../types";

function makeCandidate(overrides: Partial<ProductCandidate>): ProductCandidate {
  return {
    provider: "ebay",
    externalId: "test-1",
    title: "Test Product",
    raw: {},
    ...overrides,
  };
}

const INTENT: ProductSearchIntent = {
  query: "drill",
  requiredSpecs: [],
  avoidSpecs: [],
  urgency: "MEDIUM",
  riskTolerance: "MEDIUM",
};

describe("scoreCandidate", () => {
  it("scores a well-priced, highly-rated product as BEST_VALUE", () => {
    const c = makeCandidate({
      price: 20,
      rating: 4.9,
      reviewCount: 150,
      shippingCost: 0,
      condition: "NEW",
    });
    const allPrices = [20, 25, 30, 35, 40];
    const s = scoreCandidate(c, allPrices, INTENT);
    expect(s.relevanceScore).toBeGreaterThanOrEqual(80);
    expect(s.valueLabel).toBe("BEST_VALUE");
  });

  it("penalizes over-budget items", () => {
    const c = makeCandidate({ price: 200 });
    const allPrices = [20, 25, 30];
    const intent = { ...INTENT, budgetMax: 50 };
    const s = scoreCandidate(c, allPrices, intent);
    expect(s.relevanceScore).toBeLessThan(50);
    expect(s.valueLabel).toBe("RISKY");
  });

  it("marks no-rating items as low trust", () => {
    const c = makeCandidate({ price: 25 });
    const allPrices = [25, 30, 35];
    const s = scoreCandidate(c, allPrices, INTENT);
    const trustAxis = s.axisScores.find((a) => a.label === "Seller Trust");
    expect(trustAxis).toBeDefined();
    expect(trustAxis!.score).toBeLessThanOrEqual(20);
    expect(trustAxis!.why).toContain("No seller");
  });

  it("scores free shipping higher", () => {
    const c = makeCandidate({ price: 25, shippingCost: 0 });
    const d = makeCandidate({
      price: 25,
      shippingCost: 50,
      externalId: "test-2",
    });
    const allPrices = [25, 25];
    const sc = scoreCandidate(c, allPrices, INTENT);
    const sd = scoreCandidate(d, allPrices, INTENT);
    const shippingAxisC = sc.axisScores.find((a) => a.label === "Shipping")!;
    const shippingAxisD = sd.axisScores.find((a) => a.label === "Shipping")!;
    expect(shippingAxisC.score).toBeGreaterThan(shippingAxisD.score);
  });

  it("gives new items higher condition score", () => {
    const c = makeCandidate({ price: 25, condition: "NEW" });
    const d = makeCandidate({
      price: 25,
      condition: "FOR PARTS OR NOT WORKING",
      externalId: "test-2",
    });
    const allPrices = [25, 25];
    const sc = scoreCandidate(c, allPrices, INTENT);
    const sd = scoreCandidate(d, allPrices, INTENT);
    const condAxisC = sc.axisScores.find((a) => a.label === "Condition")!;
    const condAxisD = sd.axisScores.find((a) => a.label === "Condition")!;
    expect(condAxisC.score).toBeGreaterThan(condAxisD.score);
  });
});

describe("rankCandidates", () => {
  it("returns empty result for no candidates", () => {
    const r = rankCandidates([], INTENT);
    expect(r.ranked).toHaveLength(0);
    expect(r.topPick).toBeNull();
    expect(r.marketInsights.warnings).toContain("No candidates to rank");
  });

  it("ranks candidates by composite score", () => {
    const candidates = [
      makeCandidate({
        externalId: "best",
        price: 20,
        rating: 4.9,
        reviewCount: 500,
      }),
      makeCandidate({
        externalId: "mid",
        price: 25,
        rating: 3.5,
        reviewCount: 10,
      }),
      makeCandidate({
        externalId: "worst",
        price: 100,
        rating: 1,
        reviewCount: 0,
      }),
    ];
    const r = rankCandidates(candidates, INTENT);
    expect(r.ranked).toHaveLength(3);
    expect(r.ranked[0].externalId).toBe("best");
    expect(r.ranked[2].externalId).toBe("worst");
    expect(r.topPick?.externalId).toBe("best");
  });

  it("identifies best price and premium picks", () => {
    const candidates = [
      makeCandidate({ externalId: "cheap", price: 10, rating: 2 }),
      makeCandidate({
        externalId: "premium",
        price: 50,
        rating: 5,
        reviewCount: 1000,
      }),
      makeCandidate({
        externalId: "middle",
        price: 25,
        rating: 4,
        reviewCount: 100,
      }),
    ];
    const r = rankCandidates(candidates, INTENT);
    expect(r.bestPrice?.externalId).toBe("cheap");
    expect(r.premiumPick?.externalId).toBe("premium");
  });

  it("warns about extreme price variation", () => {
    const candidates = [
      makeCandidate({ externalId: "a", price: 10 }),
      makeCandidate({ externalId: "b", price: 100 }),
      makeCandidate({ externalId: "c", price: 10 }),
    ];
    const r = rankCandidates(candidates, INTENT);
    expect(
      r.marketInsights.warnings.some(
        (w) => w.includes("varies") || w.includes("Price"),
      ),
    ).toBe(true);
  });

  it("computes market insights", () => {
    const candidates = [
      makeCandidate({ externalId: "a", price: 10, condition: "NEW" }),
      makeCandidate({ externalId: "b", price: 20, condition: "NEW" }),
      makeCandidate({ externalId: "c", price: 30, condition: "USED" }),
    ];
    const r = rankCandidates(candidates, INTENT);
    expect(r.marketInsights.priceRange.min).toBe(10);
    expect(r.marketInsights.priceRange.max).toBe(30);
    expect(r.marketInsights.priceRange.avg).toBe(20);
    expect(r.marketInsights.priceRange.median).toBe(20);
    expect(r.marketInsights.conditionDistribution["NEW"]).toBe(2);
    expect(r.marketInsights.conditionDistribution["USED"]).toBe(1);
  });
});

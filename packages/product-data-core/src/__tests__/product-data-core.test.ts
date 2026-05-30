import { describe, expect, it } from "vitest";
import {
  MockProductDataAdapter,
  parseProductSearchIntent,
  productCandidateToEvidence,
  simulateProductScenarios,
  type ProductCandidate,
  type ProductSearchIntent,
  type SupplierCandidate,
} from "../index";

function intent(
  overrides: Partial<ProductSearchIntent> = {},
): ProductSearchIntent {
  return {
    query: "automatic welding robot",
    currency: "VND",
    budgetMax: 100_000_000,
    quantity: 12,
    requiredSpecs: ["automatic", "warranty"],
    avoidSpecs: [],
    buyerUseCase: "factory procurement buyer needs durable equipment",
    urgency: "MEDIUM",
    riskTolerance: "MEDIUM",
    ...overrides,
  };
}

function candidate(
  overrides: Partial<ProductCandidate> = {},
): ProductCandidate {
  return {
    provider: "mock",
    externalId: "candidate-1",
    title: "Automatic welding robot with warranty",
    url: "https://example.test/candidate-1",
    price: 92_000_000,
    currency: "VND",
    unit: "set",
    condition: "new",
    sellerName: "Verified Robotics Co.",
    sellerId: "seller-1",
    sellerCountry: "China",
    itemLocation: "Shenzhen, China",
    shippingCost: 4_000_000,
    deliveryEstimate: "18-25 days",
    rating: 4.8,
    reviewCount: 80,
    availability: "in_stock",
    raw: { warranty: "12 months", verificationLevel: "verified" },
    ...overrides,
  };
}

function supplier(
  overrides: Partial<SupplierCandidate> = {},
): SupplierCandidate {
  return {
    provider: "mock",
    sellerName: "Verified Robotics Co.",
    sellerId: "seller-1",
    country: "China",
    profileUrl: "https://example.test/seller-1",
    reputation: "4.8/5",
    listingCount: 50,
    verificationLevel: "verified",
    raw: { source: "mock" },
    ...overrides,
  };
}

describe("Product Data API foundation", () => {
  it("creates ProductSearchIntent from customer text", () => {
    const result = parseProductSearchIntent(
      "Tôi muốn mua robot hàn tự động, ngân sách 100 triệu, mua 12 bộ, ưu tiên bền.",
      { targetCountry: "Vietnam" },
    );

    expect(result.query).toContain("robot hàn tự động");
    expect(result.budgetMax).toBe(100_000_000);
    expect(result.quantity).toBe(12);
    expect(result.requiredSpecs).toContain("durable");
    expect(result.requiredSpecs).toContain("automatic");
    expect(result.targetCountry).toBe("Vietnam");
  });

  it("MockProductDataAdapter returns normalized ProductCandidate[]", async () => {
    const adapter = new MockProductDataAdapter();
    const result = await adapter.search(intent({ requiredSpecs: [] }));

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.provider).toBe("mock");
    expect(result.candidates[0]?.externalId).toBeTruthy();
    expect(result.providerMeta.provider).toBe("mock");
  });

  it("converts a ProductCandidate into ProductEvidence", () => {
    const evidence = productCandidateToEvidence(candidate(), supplier());

    expect(evidence.sourceProvider).toBe("mock");
    expect(evidence.productTitle).toContain("Automatic welding robot");
    expect(evidence.evidenceQuality).toBe("L4_VERIFIED_SUPPLIER");
    expect(evidence.missingProofFlags).not.toContain("NEEDS_PRICE");
  });

  it("price chaser sees cheap but risky candidate", () => {
    const simulation = simulateProductScenarios(
      intent({ riskTolerance: "HIGH", requiredSpecs: [] }),
      [
        candidate({
          externalId: "cheap-risky",
          price: 50_000_000,
          sellerName: "Unknown Outlet",
          sellerId: undefined,
          rating: undefined,
          reviewCount: undefined,
          raw: {},
        }),
      ],
    );

    expect(simulation.scenarioTypes).toContain("PRICE_CHASER");
    expect(simulation.recommendations[0]?.recommendation).toBe(
      "CHEAP_BUT_RISKY",
    );
  });

  it("risk averse buyer requests more proof for weak supplier data", () => {
    const simulation = simulateProductScenarios(
      intent({ riskTolerance: "LOW", requiredSpecs: [] }),
      [candidate({ sellerName: undefined, sellerId: undefined, raw: {} })],
    );

    expect(simulation.scenarioTypes).toContain("RISK_AVERSE");
    expect(simulation.recommendations[0]?.recommendation).toBe(
      "REQUEST_MORE_PROOF",
    );
    expect(simulation.recommendations[0]?.missingProof).toContain(
      "NEEDS_SUPPLIER_IDENTITY",
    );
  });

  it("quality first buyer prefers stronger proof over cheapest option", () => {
    const lowQuality = candidate({
      externalId: "cheap",
      title: "Cheap welding robot",
      price: 55_000_000,
      sellerId: undefined,
      rating: undefined,
      raw: {},
    });
    const highQuality = candidate({ externalId: "quality", price: 96_000_000 });

    const simulation = simulateProductScenarios(
      intent({
        requiredSpecs: ["warranty", "automatic"],
        riskTolerance: "LOW",
      }),
      [lowQuality, highQuality],
      [supplier()],
    );

    expect(simulation.scenarioTypes).toContain("QUALITY_FIRST");
    expect(simulation.recommendations[0]?.candidate.externalId).toBe("quality");
  });

  it("urgent buyer requests delivery proof when shipping is missing", () => {
    const simulation = simulateProductScenarios(
      intent({ urgency: "HIGH", requiredSpecs: [] }),
      [candidate({ deliveryEstimate: undefined, shippingCost: undefined })],
      [supplier()],
    );

    expect(simulation.scenarioTypes).toContain("URGENT_BUYER");
    expect(simulation.recommendations[0]?.recommendation).toBe(
      "REQUEST_MORE_PROOF",
    );
    expect(simulation.recommendations[0]?.missingProof).toContain(
      "NEEDS_DELIVERY_ESTIMATE",
    );
  });

  it("low budget buyer negotiates when candidate is slightly over budget", () => {
    const simulation = simulateProductScenarios(
      intent({ budgetMax: 90_000_000, requiredSpecs: [] }),
      [candidate({ price: 96_000_000 })],
      [supplier()],
    );

    expect(simulation.scenarioTypes).toContain("LOW_BUDGET");
    expect(simulation.recommendations[0]?.recommendation).toBe("NEGOTIATE");
  });

  it("missing supplier identity blocks strong recommendation", () => {
    const simulation = simulateProductScenarios(intent({ requiredSpecs: [] }), [
      candidate({ sellerName: undefined, sellerId: undefined }),
    ]);

    expect(simulation.recommendations[0]?.recommendation).toBe(
      "REQUEST_MORE_PROOF",
    );
    expect(
      simulation.recommendations[0]?.questionsToAskSupplier.join(" "),
    ).toContain("legal seller");
  });

  it("missing shipping proof is explicit", () => {
    const evidence = productCandidateToEvidence(
      candidate({ shippingCost: undefined, deliveryEstimate: undefined }),
      supplier(),
    );

    expect(evidence.missingProofFlags).toContain("NEEDS_SHIPPING_COST");
    expect(evidence.missingProofFlags).toContain("NEEDS_DELIVERY_ESTIMATE");
  });

  it("missing warranty asks for warranty proof", () => {
    const simulation = simulateProductScenarios(
      intent({ requiredSpecs: ["warranty"] }),
      [candidate({ raw: { verificationLevel: "verified" } })],
      [supplier()],
    );

    expect(simulation.recommendations[0]?.recommendation).toBe(
      "REQUEST_MORE_PROOF",
    );
    expect(simulation.recommendations[0]?.missingProof).toContain(
      "NEEDS_WARRANTY",
    );
  });

  it("avoid recommendation for far over budget product", () => {
    const simulation = simulateProductScenarios(
      intent({ budgetMax: 100_000_000, requiredSpecs: [] }),
      [candidate({ price: 160_000_000 })],
      [supplier()],
    );

    expect(simulation.recommendations[0]?.recommendation).toBe("AVOID");
  });

  it("best match with acceptable proof", () => {
    const simulation = simulateProductScenarios(
      intent(),
      [candidate()],
      [supplier()],
    );

    expect(simulation.recommendations[0]?.recommendation).toBe("BEST_MATCH");
    expect(simulation.recommendations[0]?.score.total).toBeGreaterThanOrEqual(
      78,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  computeSwitchDecision,
  type SwitchDecisionInput,
} from "../switch-decision";

function makeInput(
  overrides?: Partial<SwitchDecisionInput>,
): SwitchDecisionInput {
  return {
    baseline: null,
    alternatives: [],
    evidenceCount: 0,
    defaultCurrency: "USD",
    decisionAuthorityLevel: "FINAL_DECISION_MAKER",
    payerKnown: true,
    consequenceOwnerKnown: true,
    ...overrides,
  };
}

describe("computeSwitchDecision", () => {
  describe("INSUFFICIENT_EVIDENCE cases", () => {
    it("returns INSUFFICIENT_EVIDENCE when no baseline, no alternatives, no evidence", () => {
      const result = computeSwitchDecision(makeInput());
      expect(result.recommendation).toBe("INSUFFICIENT_EVIDENCE");
      expect(result.confidence).toBe("LOW");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.missingProof.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("WAIT cases", () => {
    it("returns WAIT when baseline exists but no alternatives and no evidence", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "50",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [],
          evidenceCount: 0,
        }),
      );
      expect(result.recommendation).toBe("WAIT");
      expect(result.dependencyRiskScore).toBe(70);
    });

    it("returns WAIT when savings are negative or zero", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "150",
              totalCost: "1500",
              currency: "USD",
              leadTime: "30 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 1,
        }),
      );
      expect(result.recommendation).toBe("WAIT");
      expect(result.savingsPercent).toBeLessThanOrEqual(0);
    });
  });

  describe("NEGOTIATE cases", () => {
    it("returns NEGOTIATE when savings exist but evidence is weak", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
              leadTime: "30 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 1,
        }),
      );
      expect(result.recommendation).toBe("NEGOTIATE");
      expect(result.savingsPercent).toBe(20);
      expect(result.monthlySavings).toBe(200);
      expect(result.annualSavings).toBe(2400);
    });

    it("returns NEGOTIATE when savings are small (< 20%)", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "90",
              totalCost: "900",
              currency: "USD",
              leadTime: "30 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.recommendation).toBe("NEGOTIATE");
      expect(result.savingsPercent).toBe(10);
    });

    it("returns NEGOTIATE when savings >= 20% but only one alternative (high dependency risk)", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "70",
              totalCost: "700",
              currency: "USD",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.recommendation).toBe("NEGOTIATE");
      expect(result.savingsPercent).toBe(30);
      expect(result.dependencyRiskScore).toBe(70);
    });
  });

  describe("SWITCH cases", () => {
    it("returns SWITCH when savings >= 20%, evidence sufficient, manageable risk", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
            landedCost: "105",
            marketBenchmarkPrice: "98",
          },
          alternatives: [
            {
              unitPrice: "70",
              totalCost: "700",
              currency: "USD",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "75",
              totalCost: "750",
              currency: "USD",
              leadTime: "28 days",
              paymentTerm: "net45",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.recommendation).toBe("SWITCH");
      expect(result.confidence).toBe("HIGH");
      expect(result.overallScore).toBeGreaterThanOrEqual(60);
    });

    it("returns SWITCH with large savings margin", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "200",
            originUnitPrice: "190",
            quantity: "100",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
            landedCost: "210",
            marketBenchmarkPrice: "195",
          },
          alternatives: [
            {
              unitPrice: "120",
              totalCost: "12000",
              currency: "USD",
              leadTime: "20 days",
              paymentTerm: "tt",
            },
            {
              unitPrice: "130",
              totalCost: "13000",
              currency: "USD",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "140",
              totalCost: "14000",
              currency: "USD",
              leadTime: "35 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 5,
        }),
      );
      expect(result.recommendation).toBe("SWITCH");
      expect(result.confidence).toBe("HIGH");
      expect(result.monthlySavings).toBe(8000);
      expect(result.annualSavings).toBe(96000);
      expect(result.savingsPercent).toBe(40);
    });
  });

  describe("scoring edge cases", () => {
    it("computes savings from totalCost when unit price is unavailable", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
          },
          alternatives: [
            {
              totalCost: "700",
              currency: "USD",
            },
          ],
          evidenceCount: 1,
        }),
      );
      expect(result.monthlySavings).toBe(300);
      expect(result.savingsPercent).toBe(30);
    });

    it("flags high payment risk for advance payment terms", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
            paymentTerms: "advance payment 100%",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
              paymentTerm: "tt",
            },
            {
              unitPrice: "85",
              totalCost: "850",
              currency: "USD",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.paymentRiskScore).toBeGreaterThanOrEqual(70);
      expect(result.riskFlags.some((f) => f.includes("payment risk"))).toBe(
        true,
      );
    });

    it("flags lead time risk when alternative is much slower", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "14 days",
          },
          alternatives: [
            {
              unitPrice: "70",
              totalCost: "700",
              currency: "USD",
              leadTime: "45 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "75",
              totalCost: "750",
              currency: "USD",
              leadTime: "30 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.leadTimeRiskScore).toBeGreaterThanOrEqual(50);
    });

    it("handles missing baseline pricing gracefully", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            currency: "USD",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
            },
          ],
          evidenceCount: 2,
        }),
      );
      expect(result.recommendation).toBe("WAIT");
      expect(result.monthlySavings).toBeNull();
      expect(
        result.missingProof.some((m) => m.includes("Baseline pricing")),
      ).toBe(true);
    });

    it("defaults to USD when no currency is specified", () => {
      const result = computeSwitchDecision(
        makeInput({
          defaultCurrency: "USD",
          baseline: {
            unitPrice: "100",
            quantity: "10",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "75",
              totalCost: "750",
              leadTime: "28 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );
      expect(result.currency).toBe("USD");
    });
  });

  describe("missing proof detection", () => {
    it("lists missing baseline payment terms", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 1,
        }),
      );
      expect(result.missingProof.some((m) => m.includes("payment terms"))).toBe(
        true,
      );
    });

    it("lists missing evidence when count is zero", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
          },
          alternatives: [
            {
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
            },
          ],
          evidenceCount: 0,
        }),
      );
      expect(result.missingProof.some((m) => m.includes("evidence"))).toBe(
        true,
      );
    });
  });

  describe("human-nature dependency and authority cases", () => {
    it("shows origin and landed-cost gaps instead of guessing", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "80",
              currency: "USD",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 2,
        }),
      );

      expect(result.recommendation).not.toBe("SWITCH");
      expect(result.missingProof).toContain("origin price unknown");
      expect(result.missingProof).toContain("landed cost unknown");
      expect(result.riskFlags).toContain("ORIGIN_PRICE_UNKNOWN");
      expect(result.riskFlags).toContain("LANDED_COST_UNKNOWN");
    });

    it("flags weak supplier proof and avoids strong switch", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "60",
              totalCost: "600",
              currency: "USD",
              leadTime: "20 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "65",
              totalCost: "650",
              currency: "USD",
              leadTime: "22 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 1,
        }),
      );

      expect(result.recommendation).toBe("NEGOTIATE");
      expect(result.riskFlags).toContain("SUPPLIER_PROOF_WEAK");
    });

    it("flags no decision authority and blocks switch", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              unitPrice: "60",
              totalCost: "600",
              currency: "USD",
              leadTime: "20 days",
              paymentTerm: "net30",
            },
            {
              unitPrice: "65",
              totalCost: "650",
              currency: "USD",
              leadTime: "22 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
          decisionAuthorityLevel: "NO_AUTHORITY",
        }),
      );

      expect(result.recommendation).toBe("NEGOTIATE");
      expect(result.riskFlags).toContain("NO_DECISION_AUTHORITY");
      expect(result.missingProof).toContain("decision authority not confirmed");
    });

    it("flags broker and platform dependency deterministically", () => {
      const result = computeSwitchDecision(
        makeInput({
          baseline: {
            supplierName: "Current Distributor",
            unitPrice: "100",
            originUnitPrice: "95",
            quantity: "10",
            currency: "USD",
            paymentTerms: "net30",
            leadTime: "30 days",
          },
          alternatives: [
            {
              supplierName: "Platform Supplier",
              unitPrice: "80",
              totalCost: "800",
              currency: "USD",
              platform: "Alibaba",
              source: "marketplace platform",
              leadTime: "25 days",
              paymentTerm: "net30",
            },
            {
              supplierName: "Export Broker",
              unitPrice: "82",
              totalCost: "820",
              currency: "USD",
              source: "broker",
              leadTime: "28 days",
              paymentTerm: "net30",
            },
          ],
          evidenceCount: 3,
        }),
      );

      expect(result.riskFlags).toContain("PLATFORM_DEPENDENCY");
      expect(result.riskFlags).toContain("BROKER_DEPENDENCY");
      expect(result.summary).toContain("Who controls information");
    });
  });
});

import { describe, it, expect } from "vitest";
import { detectPain } from "../pain-detector";
import type { ParsedEvidence } from "../types";

function makeParsed(overrides: Partial<ParsedEvidence> = {}): ParsedEvidence {
  return {
    sourceType: "MANUAL_TEXT",
    productName: "Steel Coils",
    supplierName: "Thai Steel Co.",
    price: 4100,
    currency: "USD",
    unit: "MT",
    quantity: 500,
    originCountry: "Thailand",
    landedCost: 4500,
    paymentTerms: "LC at sight",
    deliveryTerms: "CIF Ho Chi Minh",
    evidenceQuality: "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS",
    evidenceQualityScore: 65,
    missingProofFlags: [],
    confidence: {},
    rawEvidenceRef: "test-ref",
    ...overrides,
  };
}

describe("detectPain", () => {
  it("returns few pain flags for a complete quote", () => {
    const result = detectPain(makeParsed());
    expect(result.painFlags).toHaveLength(0);
    expect(result.suggestedNextStep).toBe("CREATE_CASE_DRAFT");
    expect(result.suggestedReason).toContain("No significant pain detected");
  });

  it("ORIGIN_PRICE_UNKNOWN when price is missing", () => {
    const result = detectPain(makeParsed({ price: undefined }));
    expect(result.painFlags).toContain("ORIGIN_PRICE_UNKNOWN");
  });

  it("ORIGIN_PRICE_UNKNOWN when NEEDS_CURRENT_PRICE flag present", () => {
    const result = detectPain(
      makeParsed({ missingProofFlags: ["NEEDS_CURRENT_PRICE"] }),
    );
    expect(result.painFlags).toContain("ORIGIN_PRICE_UNKNOWN");
  });

  it("LANDED_COST_UNKNOWN when landed cost missing", () => {
    const result = detectPain(makeParsed({ landedCost: undefined }));
    expect(result.painFlags).toContain("LANDED_COST_UNKNOWN");
  });

  it("SUPPLIER_PROOF_WEAK when supplier missing", () => {
    const result = detectPain(makeParsed({ supplierName: undefined }));
    expect(result.painFlags).toContain("SUPPLIER_PROOF_WEAK");
  });

  it("PRICE_GAP_POSSIBLE when price exists but no origin", () => {
    const result = detectPain(
      makeParsed({ price: 4100, originCountry: undefined }),
    );
    expect(result.painFlags).toContain("PRICE_GAP_POSSIBLE");
  });

  it("MARKET_BENCHMARK_MISSING when flag present", () => {
    const result = detectPain(
      makeParsed({ missingProofFlags: ["NEEDS_MARKET_BENCHMARK"] }),
    );
    expect(result.painFlags).toContain("MARKET_BENCHMARK_MISSING");
  });

  it("QUALITY_PROOF_MISSING when flag present", () => {
    const result = detectPain(
      makeParsed({ missingProofFlags: ["NEEDS_QUALITY_PROOF"] }),
    );
    expect(result.painFlags).toContain("QUALITY_PROOF_MISSING");
  });

  it("DELIVERY_TERMS_MISSING when delivery missing", () => {
    const result = detectPain(makeParsed({ deliveryTerms: undefined }));
    expect(result.painFlags).toContain("DELIVERY_TERMS_MISSING");
  });

  it("PAYMENT_TERMS_MISSING when payment missing", () => {
    const result = detectPain(makeParsed({ paymentTerms: undefined }));
    expect(result.painFlags).toContain("PAYMENT_TERMS_MISSING");
  });

  it("EVIDENCE_WEAK for L0 quality", () => {
    const result = detectPain(
      makeParsed({
        evidenceQuality: "L0_UNVERIFIED_CLAIM",
        evidenceQualityScore: 10,
      }),
    );
    expect(result.painFlags).toContain("EVIDENCE_WEAK");
  });

  it("EVIDENCE_WEAK for L1 quality", () => {
    const result = detectPain(
      makeParsed({
        evidenceQuality: "L1_SCREENSHOT_OR_LINK_ONLY",
        evidenceQualityScore: 15,
      }),
    );
    expect(result.painFlags).toContain("EVIDENCE_WEAK");
  });

  it("NEEDS_MORE_EVIDENCE for L0", () => {
    const result = detectPain(
      makeParsed({
        evidenceQuality: "L0_UNVERIFIED_CLAIM",
        evidenceQualityScore: 10,
      }),
    );
    expect(result.suggestedNextStep).toBe("NEEDS_MORE_EVIDENCE");
  });

  it("NEEDS_SUPPLIER_IDENTITY when supplier missing", () => {
    const result = detectPain(makeParsed({ supplierName: undefined }));
    expect(result.suggestedNextStep).toBe("NEEDS_SUPPLIER_IDENTITY");
  });

  it("REQUEST_MORE_EVIDENCE when NEEDS_LANDED_COST", () => {
    const result = detectPain(
      makeParsed({ missingProofFlags: ["NEEDS_LANDED_COST"] }),
    );
    expect(result.suggestedNextStep).toBe("REQUEST_MORE_EVIDENCE");
  });

  it("WAIT when score below 40", () => {
    const result = detectPain(makeParsed({ evidenceQualityScore: 35 }));
    expect(result.suggestedNextStep).toBe("WAIT");
  });

  it("SINGLE_SUPPLIER_DEPENDENCY when supplier known", () => {
    const result = detectPain(makeParsed({ supplierName: "Thai Steel Co." }));
    expect(result.dependencyFlags).toContain("SINGLE_SUPPLIER_DEPENDENCY");
  });

  it("ORIGIN_VALUE_BLINDNESS when no price and no origin", () => {
    const result = detectPain(
      makeParsed({ price: undefined, originCountry: undefined }),
    );
    expect(result.dependencyFlags).toContain("ORIGIN_VALUE_BLINDNESS");
  });

  it("SUPPLIER_INFORMATION_CONTROL when no supplier", () => {
    const result = detectPain(makeParsed({ supplierName: undefined }));
    expect(result.dependencyFlags).toContain("SUPPLIER_INFORMATION_CONTROL");
  });

  it("OPERATOR_INTERPRETATION_DEPENDENCY for L0", () => {
    const result = detectPain(
      makeParsed({
        evidenceQuality: "L0_UNVERIFIED_CLAIM",
        evidenceQualityScore: 10,
      }),
    );
    expect(result.dependencyFlags).toContain(
      "OPERATOR_INTERPRETATION_DEPENDENCY",
    );
  });

  it("suggestedReason includes missing info for multiple pain flags", () => {
    const result = detectPain(
      makeParsed({
        supplierName: undefined,
        price: undefined,
        originCountry: undefined,
        landedCost: undefined,
      }),
    );
    expect(result.suggestedReason).toContain("Origin price is unknown");
    expect(result.suggestedReason).toContain("Landed cost is missing");
    expect(result.suggestedReason).toContain(
      "Supplier identity or proof is weak",
    );
  });

  it("does not hallucinate flags when data is complete", () => {
    const result = detectPain(makeParsed());
    expect(result.painFlags).toEqual([]);
    expect(result.dependencyFlags).toEqual(["SINGLE_SUPPLIER_DEPENDENCY"]);
  });
});

import { describe, it, expect } from "vitest";
import { ManualTextEvidenceAdapter } from "../manual-text";
import type { EvidenceInput } from "../types";

const adapter = new ManualTextEvidenceAdapter();

function input(text: string, ref = "test-ref"): EvidenceInput {
  return { text, sourceType: "MANUAL_TEXT", reference: ref };
}

describe("ManualTextEvidenceAdapter", () => {
  it("rejects empty text", () => {
    expect(adapter.canHandle(input(""))).toBe(false);
    expect(adapter.canHandle(input("   "))).toBe(false);
  });

  it("accepts non-empty manual text", () => {
    expect(adapter.canHandle(input("some text"))).toBe(true);
  });

  it("rejects non-manual source types", () => {
    expect(
      adapter.canHandle({
        text: "hello",
        sourceType: "API_RESPONSE",
        reference: "x",
      }),
    ).toBe(false);
  });

  describe("weak quote — price with unit, no supplier, no product name", () => {
    const result = adapter.parse(input("Price is about 4,200 USD per ton"));

    it("detects price and currency", () => {
      expect(result.price).toBe(4200);
      expect(result.currency).toBe("USD");
    });

    it("detects unit from per-ton", () => {
      expect(result.unit).toBe("MT");
    });

    it("has L1 quality (price + unit = 2 fields)", () => {
      expect(result.evidenceQuality).toBe("L1_SCREENSHOT_OR_LINK_ONLY");
      expect(result.evidenceQualityScore).toBe(20);
    });

    it("does NOT detect product or supplier", () => {
      expect(result.productName).toBeUndefined();
      expect(result.supplierName).toBeUndefined();
    });

    it("flags missing fields", () => {
      expect(result.missingProofFlags).toContain("NEEDS_SUPPLIER_IDENTITY");
      expect(result.missingProofFlags).toContain("NEEDS_PAYMENT_TERMS");
      expect(result.missingProofFlags).toContain("NEEDS_DELIVERY_TERMS");
      expect(result.missingProofFlags).toContain("NEEDS_LANDED_COST");
    });
  });

  describe("complete quote — all fields present", () => {
    const result = adapter.parse(
      input(
        "Product: Premium Robusta coffee beans, grade 1\n" +
          "Supplier: Central Highlands Beans Co.\n" +
          "Price: USD 4,100/MT FOB HCMC\n" +
          "Quantity: 500 MT\n" +
          "Origin: Vietnam\n" +
          "Payment: L/C at sight, 30 days after B/L\n" +
          "Delivery: FOB Ho Chi Minh, lead time 10 days\n" +
          "Landed cost: CIF Singapore USD 4,350/MT",
        "quote-001",
      ),
    );

    it("extracts all basic fields", () => {
      expect(result.productName).toContain("Robusta coffee");
      expect(result.supplierName).toContain("Central Highlands");
      expect(result.price).toBe(4100);
      expect(result.currency).toBe("USD");
      expect(result.unit).toBe("MT");
      expect(result.quantity).toBe(500);
      expect(result.originCountry?.toLowerCase()).toContain("vietnam");
    });

    it("extracts terms", () => {
      expect(result.paymentTerms).toBeTruthy();
      expect(result.deliveryTerms).toBeTruthy();
      expect(result.landedCost).toBe(4350);
    });

    it("has L3 quality", () => {
      expect(result.evidenceQuality).toBe(
        "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS",
      );
      expect(result.evidenceQualityScore).toBe(60);
    });

    it("has minimal missing proof flags", () => {
      expect(result.missingProofFlags).not.toContain("NEEDS_SUPPLIER_IDENTITY");
      expect(result.missingProofFlags).not.toContain("NEEDS_CURRENT_PRICE");
      expect(result.missingProofFlags).not.toContain("NEEDS_PAYMENT_TERMS");
      expect(result.missingProofFlags).not.toContain("NEEDS_DELIVERY_TERMS");
    });

    it("has HIGH confidence for extracted fields", () => {
      expect(result.confidence.price).toBe("HIGH");
      expect(result.confidence.supplierName).toBe("HIGH");
    });

    it("sets rawEvidenceRef", () => {
      expect(result.rawEvidenceRef).toBe("quote-001");
    });
  });

  describe("chat text — missing supplier proof", () => {
    const result = adapter.parse(
      input(
        "Hey, we can get Robusta coffee at around 4,200 per ton. They're in Vietnam.",
      ),
    );

    it("detects partial info", () => {
      expect(result.productName).toBeTruthy();
      expect(result.price).toBe(4200);
      expect(result.originCountry?.toLowerCase()).toContain("vietnam");
    });

    it("has L1 quality", () => {
      expect(result.evidenceQuality).toBe("L1_SCREENSHOT_OR_LINK_ONLY");
    });

    it("flags missing supplier identity", () => {
      expect(result.missingProofFlags).toContain("NEEDS_SUPPLIER_IDENTITY");
    });

    it("flags missing terms", () => {
      expect(result.missingProofFlags).toContain("NEEDS_PAYMENT_TERMS");
      expect(result.missingProofFlags).toContain("NEEDS_DELIVERY_TERMS");
    });

    it("has LOW confidence for vague price", () => {
      expect(result.confidence.price).toBe("LOW");
    });
  });

  describe("price without unit", () => {
    const result = adapter.parse(
      input("Steel sheet price: USD 850 per unit, supplier: Hai Phong Steel"),
    );

    it("detects price and supplier", () => {
      expect(result.price).toBe(850);
      expect(result.supplierName).toContain("Hai Phong");
    });

    it("has L2 quality (price + supplier + product)", () => {
      expect(result.evidenceQuality).toBe("L2_BASIC_QUOTE_OR_INVOICE");
    });

    it("flags missing unit", () => {
      expect(result.missingProofFlags).toContain("NEEDS_PAYMENT_TERMS");
      expect(result.missingProofFlags).toContain("NEEDS_DELIVERY_TERMS");
    });
  });

  describe("origin price missing", () => {
    const result = adapter.parse(
      input(
        "Supplier: Mekong Rice Export\nPrice: USD 520/MT\nProduct: Jasmine rice\nDelivery: FOB HCMC",
      ),
    );

    it("detects price, supplier, product", () => {
      expect(result.price).toBe(520);
      expect(result.supplierName).toContain("Mekong Rice");
      expect(result.productName).toContain("Jasmine rice");
    });

    it("flags origin missing", () => {
      expect(result.missingProofFlags).toContain("NEEDS_ORIGIN_PRICE");
    });

    it("has L3 quality (price + supplier + product + FOB delivery)", () => {
      expect(result.evidenceQuality).toBe(
        "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS",
      );
    });
  });

  describe("landed cost missing", () => {
    const result = adapter.parse(
      input(
        "Product: Green coffee beans\nSupplier: Dalat Export\nPrice: USD 3,950/MT FOB\nQuantity: 200 MT\nPayment: T/T 30 days",
      ),
    );

    it("detects all basic fields", () => {
      expect(result.productName).toBeTruthy();
      expect(result.supplierName).toContain("Dalat");
      expect(result.price).toBe(3950);
      expect(result.quantity).toBe(200);
    });

    it("flags landed cost missing", () => {
      expect(result.missingProofFlags).toContain("NEEDS_LANDED_COST");
    });

    it("L3 quality (price + supplier + product + payment + fob)", () => {
      expect(result.evidenceQuality).toBe(
        "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS",
      );
    });
  });
});

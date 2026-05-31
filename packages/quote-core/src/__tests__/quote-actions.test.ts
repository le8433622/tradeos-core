import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockQuoteCreate,
  mockQuoteFindUnique,
  mockQuoteUpdate,
  mockRunFindUnique,
  mockAuditCreate,
  mockOrgFindUnique,
} = vi.hoisted(() => ({
  mockQuoteCreate: vi.fn(),
  mockQuoteFindUnique: vi.fn(),
  mockQuoteUpdate: vi.fn(),
  mockRunFindUnique: vi.fn(),
  mockAuditCreate: vi.fn().mockResolvedValue({ id: "audit-1" }),
  mockOrgFindUnique: vi
    .fn()
    .mockResolvedValue({ mfaRequired: false, id: "org-1" }),
}));

vi.mock("@tradeos/database", () => ({
  prisma: {
    $transaction: (cb: (tx: any) => unknown) =>
      cb({
        quoteDraft: {
          create: mockQuoteCreate,
          findUnique: mockQuoteFindUnique,
          update: mockQuoteUpdate,
        },
        sourcingRun: { findUnique: mockRunFindUnique },
        auditLog: { create: mockAuditCreate },
        organization: { findUnique: mockOrgFindUnique },
      }),
    quoteDraft: {
      create: mockQuoteCreate,
      findUnique: mockQuoteFindUnique,
      update: mockQuoteUpdate,
    },
    sourcingRun: { findUnique: mockRunFindUnique },
    auditLog: { create: mockAuditCreate },
    organization: { findUnique: mockOrgFindUnique },
  },
}));

import "../index";
import { executeAction, type ActionContext } from "@tradeos/policy-core";

type ActionResult = Record<string, unknown>;

function ctx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    actorUserId: "user-1",
    organizationId: "org-1",
    role: "OWNER",
    source: "manual",
    mfaLevel: "aal1",
    ...overrides,
  };
}

describe("quote.draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuoteCreate.mockResolvedValue({ id: "quote-1" });
  });

  it("creates a draft quote with complete data", async () => {
    mockQuoteCreate.mockResolvedValue({ id: "quote-1" });

    const result: ActionResult = await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Robot CNC welding quote",
        supplierName: "TechNova Viet Nam",
        buyPrice: 85_000_000,
        currency: "VND",
        quantity: 12,
        unit: "bộ",
        shippingCost: 5_000_000,
        handlingCost: 2_000_000,
        riskBuffer: 1_000_000,
        taxOrFee: 500_000,
        targetMarginPercent: 15,
        deliveryEstimate: "30 days after deposit",
        refundTerms: "50% refund if cancelled within 7 days",
        quoteExpiresAt: "2026-07-01T00:00:00.000Z",
        riskNotes: "First-time supplier, verify before full payment",
        evidenceIds: ["evt-001", "evt-002"],
      },
      ctx(),
    );

    expect(result.id).toBe("quote-1");
    expect(result.warnings).toEqual([]);

    const call = mockQuoteCreate.mock.calls[0][0].data;
    expect(call.title).toBe("Robot CNC welding quote");
    expect(call.supplierName).toBe("TechNova Viet Nam");
    expect(call.buyPrice).toBe(85_000_000);
    expect(call.currency).toBe("VND");
    expect(call.quantity).toBe(12);
    expect(call.salePrice).toBe(107_525_000);
    expect(call.grossProfit).toBe(14_025_000);
    expect(call.status).toBe("DRAFT");
    expect(call.depositAmount).toBe(306_000_000);
    expect(call.evidenceIds).toEqual(["evt-001", "evt-002"]);
    expect(call.createdBy).toBe("user-1");
  });

  it("rejects missing buyPrice", async () => {
    const promise = executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        currency: "USD",
      },
      ctx(),
    );

    await expect(promise).rejects.toThrow("INVALID_REQUEST_BODY");
    expect(mockQuoteCreate).not.toHaveBeenCalled();
  });

  it("flags missing shippingCost as warning", async () => {
    const result: ActionResult = await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
        currency: "USD",
      },
      ctx(),
    );

    expect(result.warnings).toContain("QUOTE_SHIPPING_MISSING_NEEDS_OVERRIDE");
    expect(mockQuoteCreate.mock.calls[0][0].data.status).toBe(
      "NEEDS_MORE_COST_DATA",
    );
  });

  it("flags low margin as warning", async () => {
    const result: ActionResult = await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
        currency: "USD",
        shippingCost: 100,
        targetMarginPercent: 3,
      },
      ctx(),
    );

    expect(result.warnings).toContain("QUOTE_LOW_MARGIN_NEEDS_APPROVAL");
    expect(mockQuoteCreate.mock.calls[0][0].data.status).toBe(
      "NEEDS_MORE_COST_DATA",
    );
  });

  it("allows missing shippingCost when riskNotes provided", async () => {
    const result: ActionResult = await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
        currency: "USD",
        riskNotes: "Known supplier, shipping included in price",
      },
      ctx(),
    );

    expect(result.warnings).not.toContain(
      "QUOTE_SHIPPING_MISSING_NEEDS_OVERRIDE",
    );
    expect(mockQuoteCreate.mock.calls[0][0].data.status).toBe("DRAFT");
  });

  it("validates sourcingRun belongs to org", async () => {
    mockRunFindUnique.mockResolvedValue({ organizationId: "other-org" });

    const promise = executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 1000,
        currency: "USD",
        sourcingRunId: "run-1",
      },
      ctx(),
    );

    await expect(promise).rejects.toThrow();
    expect(mockQuoteCreate).not.toHaveBeenCalled();
  });

  it("calculates salePrice and grossProfit correctly", async () => {
    mockQuoteCreate.mockResolvedValue({ id: "quote-1" });

    await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 100,
        currency: "USD",
        shippingCost: 20,
        handlingCost: 10,
        riskBuffer: 5,
        taxOrFee: 15,
        targetMarginPercent: 25,
      },
      ctx(),
    );

    const data = mockQuoteCreate.mock.calls[0][0].data;
    expect(data.salePrice).toBe(187.5);
    expect(data.grossProfit).toBe(37.5);
  });

  it("uses buyPrice as salePrice when no margin set", async () => {
    mockQuoteCreate.mockResolvedValue({ id: "quote-1" });

    await executeAction(
      "quote.draft",
      {
        organizationId: "org-1",
        title: "Test",
        supplierName: "Test Supplier",
        buyPrice: 100,
        currency: "USD",
        shippingCost: 20,
      },
      ctx(),
    );

    const data = mockQuoteCreate.mock.calls[0][0].data;
    expect(data.salePrice).toBe(120);
    expect(data.grossProfit).toBeUndefined();
  });
});

describe("quote.approve", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approves a DRAFT quote", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "DRAFT",
    });
    mockQuoteUpdate.mockResolvedValue({
      id: "quote-1",
      status: "APPROVED",
    });

    const result: ActionResult = await executeAction(
      "quote.approve",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );

    expect(mockQuoteUpdate.mock.calls[0][0].data.status).toBe("APPROVED");
    expect(mockQuoteUpdate.mock.calls[0][0].data.approvedBy).toBe("user-1");
    expect(result.status).toBe("APPROVED");
  });

  it("rejects approving already APPROVED quote", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "APPROVED",
    });

    const promise = executeAction(
      "quote.approve",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );
    await expect(promise).rejects.toThrow("QUOTE_ALREADY_APPROVED");
  });

  it("rejects approving sent quote", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "SENT",
    });

    const promise = executeAction(
      "quote.approve",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );
    await expect(promise).rejects.toThrow("QUOTE_CANNOT_MODIFY");
  });
});

describe("quote.markSent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks approved quote as sent", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "APPROVED",
    });
    mockQuoteUpdate.mockResolvedValue({ id: "quote-1", status: "SENT" });

    const result: ActionResult = await executeAction(
      "quote.markSent",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );

    expect(result.status).toBe("SENT");
    expect(mockQuoteUpdate.mock.calls[0][0].data.sentAt).toBeDefined();
  });

  it("rejects marking non-approved quote as sent", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "DRAFT",
    });

    const promise = executeAction(
      "quote.markSent",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );
    await expect(promise).rejects.toThrow("QUOTE_MUST_BE_APPROVED_BEFORE_SENT");
  });
});

describe("quote.customerAccept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a sent quote", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "SENT",
    });
    mockQuoteUpdate.mockResolvedValue({ id: "quote-1", status: "ACCEPTED" });

    const result: ActionResult = await executeAction(
      "quote.customerAccept",
      {
        organizationId: "org-1",
        quoteId: "quote-1",
        customerNotes: "Accepted, will deposit next week",
      },
      ctx(),
    );

    expect(result.status).toBe("ACCEPTED");
    expect(
      mockQuoteUpdate.mock.calls[0][0].data.customerAcceptedAt,
    ).toBeDefined();
  });

  it("rejects accepting non-sent quote", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "DRAFT",
    });

    const promise = executeAction(
      "quote.customerAccept",
      { organizationId: "org-1", quoteId: "quote-1" },
      ctx(),
    );
    await expect(promise).rejects.toThrow("QUOTE_MUST_BE_SENT_BEFORE_ACCEPT");
  });
});

describe("quote.customerReject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a sent quote with reason", async () => {
    mockQuoteFindUnique.mockResolvedValue({
      organizationId: "org-1",
      status: "SENT",
    });
    mockQuoteUpdate.mockResolvedValue({ id: "quote-1", status: "REJECTED" });

    const result: ActionResult = await executeAction(
      "quote.customerReject",
      {
        organizationId: "org-1",
        quoteId: "quote-1",
        rejectReason: "Too expensive, found cheaper supplier",
      },
      ctx(),
    );

    expect(result.status).toBe("REJECTED");
    expect(mockQuoteUpdate.mock.calls[0][0].data.riskNotes).toBe(
      "Too expensive, found cheaper supplier",
    );
  });
});

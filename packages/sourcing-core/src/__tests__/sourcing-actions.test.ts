import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSourcingFindUnique,
  mockSourcingCreate,
  mockSourcingUpdate,
  mockCandidateFindMany,
  mockCandidateCreate,
  mockQuoteCreate,
  mockQuoteFindMany,
  mockQuoteUpdate,
  mockEvidenceFindMany,
  mockCheckpointFindUnique,
  mockCheckpointCreate,
  mockCheckpointUpdate,
  mockHandoverCreate,
  mockHandoverFindUnique,
  mockHandoverUpdate,
  mockPaymentCreate,
  mockAuditCreate,
  mockOrgFindUnique,
} = vi.hoisted(() => {
  const mockSourcingFindUnique = vi.fn();
  const mockSourcingCreate = vi.fn();
  const mockSourcingUpdate = vi.fn();
  const mockCandidateFindMany = vi.fn();
  const mockCandidateCreate = vi.fn();
  const mockQuoteCreate = vi.fn();
  const mockQuoteFindMany = vi.fn();
  const mockQuoteUpdate = vi.fn();
  const mockEvidenceFindMany = vi.fn();
  const mockCheckpointFindUnique = vi.fn();
  const mockCheckpointCreate = vi.fn();
  const mockCheckpointUpdate = vi.fn();
  const mockHandoverCreate = vi.fn();
  const mockHandoverFindUnique = vi.fn();
  const mockHandoverUpdate = vi.fn();
  const mockPaymentCreate = vi.fn();
  const mockAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  const mockOrgFindUnique = vi.fn();
  const tx = {
    auditLog: { create: mockAuditCreate },
    organization: { findUnique: mockOrgFindUnique },
    sourcingRun: {
      findUnique: mockSourcingFindUnique,
      create: mockSourcingCreate,
      update: mockSourcingUpdate,
    },
    supplierCandidate: {
      create: mockCandidateCreate,
      findMany: mockCandidateFindMany,
    },
    supplierQuote: {
      create: mockQuoteCreate,
      findMany: mockQuoteFindMany,
      update: mockQuoteUpdate,
    },
    evidenceItem: {
      findMany: mockEvidenceFindMany,
    },
    workCheckpoint: {
      findUnique: mockCheckpointFindUnique,
      create: mockCheckpointCreate,
      update: mockCheckpointUpdate,
    },
    humanHandover: {
      create: mockHandoverCreate,
      findUnique: mockHandoverFindUnique,
      update: mockHandoverUpdate,
    },
    payment: {
      create: mockPaymentCreate,
    },
  };
  return {
    mockSourcingFindUnique,
    mockSourcingCreate,
    mockSourcingUpdate,
    mockCandidateFindMany,
    mockCandidateCreate,
    mockQuoteCreate,
    mockQuoteFindMany,
    mockQuoteUpdate,
    mockEvidenceFindMany,
    mockCheckpointFindUnique,
    mockCheckpointCreate,
    mockCheckpointUpdate,
    mockHandoverCreate,
    mockHandoverFindUnique,
    mockHandoverUpdate,
    mockPaymentCreate,
    mockAuditCreate,
    mockOrgFindUnique,
    tx,
  };
});

vi.mock("@tradeos/database", () => ({
  prisma: {
    auditLog: { create: mockAuditCreate },
    organization: { findUnique: mockOrgFindUnique },
    sourcingRun: {
      findUnique: mockSourcingFindUnique,
      create: mockSourcingCreate,
      update: mockSourcingUpdate,
    },
    supplierCandidate: {
      create: mockCandidateCreate,
      findMany: mockCandidateFindMany,
    },
    supplierQuote: {
      create: mockQuoteCreate,
      findMany: mockQuoteFindMany,
      update: mockQuoteUpdate,
    },
    evidenceItem: {
      findMany: mockEvidenceFindMany,
    },
    workCheckpoint: {
      findUnique: mockCheckpointFindUnique,
      create: mockCheckpointCreate,
      update: mockCheckpointUpdate,
    },
    humanHandover: {
      create: mockHandoverCreate,
      findUnique: mockHandoverFindUnique,
      update: mockHandoverUpdate,
    },
    payment: {
      create: mockPaymentCreate,
    },
    $transaction: vi.fn(
      async (arg: unknown) => {
        const tx = {
          auditLog: { create: mockAuditCreate },
          organization: { findUnique: mockOrgFindUnique },
          sourcingRun: {
            findUnique: mockSourcingFindUnique,
            create: mockSourcingCreate,
            update: mockSourcingUpdate,
          },
          supplierCandidate: {
            create: mockCandidateCreate,
            findMany: mockCandidateFindMany,
          },
          supplierQuote: {
            create: mockQuoteCreate,
            findMany: mockQuoteFindMany,
            update: mockQuoteUpdate,
          },
          evidenceItem: {
            findMany: mockEvidenceFindMany,
          },
          workCheckpoint: {
            findUnique: mockCheckpointFindUnique,
            create: mockCheckpointCreate,
            update: mockCheckpointUpdate,
          },
          humanHandover: {
            create: mockHandoverCreate,
            findUnique: mockHandoverFindUnique,
            update: mockHandoverUpdate,
          },
          payment: {
            create: mockPaymentCreate,
          },
        };
        if (typeof arg === "function") {
          return arg(tx);
        }
        return Promise.all(
          (arg as Array<Promise<unknown>>).map((p) =>
            p instanceof Promise ? p : Promise.resolve(p),
          ),
        );
      },
    ),
  },
  Prisma: { JsonNull: null },
}));

vi.mock("@tradeos/plan-core", () => ({
  checkEntitlement: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 10,
    current: 1,
  }),
}));

import { executeAction } from "@tradeos/policy-core";
import type { BuyerDecisionReport } from "../index";
import "../index";

const context = {
  actorUserId: "user-1",
  organizationId: "org-1",
  role: "ADMIN" as const,
  source: "manual" as const,
  mfaLevel: "aal2",
};

const ownerContext = {
  ...context,
  role: "OWNER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditCreate.mockResolvedValue({ id: "audit-1" });
  mockOrgFindUnique.mockResolvedValue({ id: "org-1", mfaRequired: false });
  mockSourcingFindUnique.mockResolvedValue({ id: "run-1", organizationId: "org-1" });
  mockSourcingCreate.mockResolvedValue({ id: "run-1", status: "DRAFT" });
  mockSourcingUpdate.mockResolvedValue({ status: "READY_FOR_REVIEW" });
  mockCandidateCreate.mockResolvedValue({ id: "candidate-1" });
  mockCandidateFindMany.mockResolvedValue([]);
  mockQuoteCreate.mockResolvedValue({ id: "quote-1" });
  mockQuoteFindMany.mockResolvedValue([]);
  mockEvidenceFindMany.mockResolvedValue([]);
  mockCheckpointFindUnique.mockResolvedValue({ id: "cp-1", organizationId: "org-1", status: "DELIVERED" });
  mockCheckpointCreate.mockResolvedValue({ id: "cp-1", status: "PENDING" });
  mockCheckpointUpdate.mockResolvedValue({ status: "DELIVERED" });
  mockHandoverCreate.mockResolvedValue({ id: "handover-1", status: "OPEN" });
  mockHandoverFindUnique.mockResolvedValue({ id: "handover-1", organizationId: "org-1" });
  mockHandoverUpdate.mockResolvedValue({ status: "RESOLVED" });
  mockPaymentCreate.mockResolvedValue({ id: "payment-1" });
});

describe("sourcing.createRun", () => {
  it("creates a sourcing run with valid input", async () => {
    mockSourcingCreate.mockResolvedValue({ id: "run-1", status: "DRAFT" });
    const result = await executeAction(
      "sourcing.createRun",
      {
        organizationId: "org-1",
        title: "Find steel suppliers",
        requirement: "Need 500 tons of steel",
      },
      context,
    );
    expect(result).toEqual({ id: "run-1", status: "DRAFT" });
    expect(mockSourcingCreate).toHaveBeenCalled();
  });

  it("rejects when entitlement exceeded", async () => {
    const { checkEntitlement } = await import("@tradeos/plan-core");
    vi.mocked(checkEntitlement).mockResolvedValueOnce({
      allowed: false,
      limit: 3,
      current: 3,
    });
    await expect(
      executeAction(
        "sourcing.createRun",
        {
          organizationId: "org-1",
          title: "Extra run",
          requirement: "N/A",
        },
        context,
      ),
    ).rejects.toThrow("ENTITLEMENT_EXCEEDED");
  });
});

describe("sourcing.addSupplierCandidate", () => {
  it("adds a supplier candidate to a sourcing run", async () => {
    mockSourcingFindUnique.mockResolvedValue({ id: "run-1", organizationId: "org-1" });
    const result = await executeAction(
      "sourcing.addSupplierCandidate",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        name: "Supplier A",
      },
      context,
    );
    expect(result).toEqual({ id: "candidate-1" });
    expect(mockCandidateCreate).toHaveBeenCalled();
  });

  it("rejects when sourcing run belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({ id: "run-1", organizationId: "org-2" });
    await expect(
      executeAction(
        "sourcing.addSupplierCandidate",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          name: "Supplier B",
        },
        context,
      ),
    ).rejects.toThrow();
  });
});

describe("sourcing.addSupplierQuote", () => {
  it("adds a quote to a sourcing run", async () => {
    const result = await executeAction(
      "sourcing.addSupplierQuote",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        productDescription: "Steel 500 tons",
      },
      context,
    );
    expect(result).toEqual({ id: "quote-1" });
    expect(mockQuoteCreate).toHaveBeenCalled();
  });
});

describe("sourcing.compareQuotes", () => {
  it("returns empty comparison when no quotes exist", async () => {
    mockQuoteFindMany.mockResolvedValue([]);
    const result = await executeAction(
      "sourcing.compareQuotes",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    ) as { quoteCount: number; bestPriceQuoteId: string | null };
    expect(result.quoteCount).toBe(0);
  });

  it("ranks quotes when multiple exist", async () => {
    mockQuoteFindMany.mockResolvedValue([
      { id: "q1", totalAmount: 500, riskScore: 30 },
      { id: "q2", totalAmount: 300, riskScore: 70 },
    ]);
    const result = await executeAction(
      "sourcing.compareQuotes",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    ) as { quoteCount: number; bestPriceQuoteId: string | null };
    expect(result.quoteCount).toBe(2);
    expect(result.bestPriceQuoteId).toBe("q1");
    expect(mockQuoteUpdate).toHaveBeenCalled();
  });
});

describe("checkpoint.create", () => {
  it("creates a checkpoint with valid input", async () => {
    const result = await executeAction(
      "checkpoint.create",
      {
        organizationId: "org-1",
        title: "Quote Collection",
        checkpointType: "QUOTE_COLLECTION",
      },
      context,
    );
    expect(result).toEqual({ id: "cp-1", status: "PENDING" });
    expect(mockCheckpointCreate).toHaveBeenCalled();
  });

  it("rejects when entitlement exceeded", async () => {
    const { checkEntitlement } = await import("@tradeos/plan-core");
    vi.mocked(checkEntitlement).mockResolvedValueOnce({
      allowed: false,
      limit: 3,
      current: 3,
    });
    await expect(
      executeAction(
        "checkpoint.create",
        {
          organizationId: "org-1",
          title: "Extra checkpoint",
          checkpointType: "QUOTE_COLLECTION",
        },
        context,
      ),
    ).rejects.toThrow("ENTITLEMENT_EXCEEDED");
  });
});

describe("checkpoint.markDelivered", () => {
  it("marks checkpoint as delivered", async () => {
    mockCheckpointFindUnique.mockResolvedValue({ id: "cp-1", organizationId: "org-1" });
    mockCheckpointUpdate.mockResolvedValue({ status: "DELIVERED" });
    const result = await executeAction(
      "checkpoint.markDelivered",
      { organizationId: "org-1", checkpointId: "cp-1" },
      context,
    );
    expect(result).toEqual({ status: "DELIVERED" });
  });
});

describe("checkpoint.approveForBilling", () => {
  it("approves a delivered checkpoint for billing", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "DELIVERED",
    });
    mockCheckpointUpdate.mockResolvedValue({ status: "APPROVED" });
    const result = await executeAction(
      "checkpoint.approveForBilling",
      { organizationId: "org-1", checkpointId: "cp-1" },
      ownerContext,
    );
    expect(result).toEqual({ status: "APPROVED" });
  });

  it("rejects when checkpoint is not delivered", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "PENDING",
    });
    await expect(
      executeAction(
        "checkpoint.approveForBilling",
        { organizationId: "org-1", checkpointId: "cp-1" },
        ownerContext,
      ),
    ).rejects.toThrow("CHECKPOINT_NOT_DELIVERED");
  });
});

describe("checkpoint.markAsBilled", () => {
  it("marks approved checkpoint as billed and creates payment record", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "APPROVED",
    });
    mockCheckpointUpdate.mockResolvedValue({ status: "BILLED" });
    mockPaymentCreate.mockResolvedValue({ id: "payment-1" });
    const result = await executeAction(
      "checkpoint.markAsBilled",
      {
        organizationId: "org-1",
        checkpointId: "cp-1",
        amount: 1500,
        currency: "USD",
      },
      ownerContext,
    );
    expect(result).toEqual({ status: "BILLED", paymentId: "payment-1" });
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 1500 }),
      }),
    );
  });

  it("rejects when checkpoint is not approved", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "DELIVERED",
    });
    await expect(
      executeAction(
        "checkpoint.markAsBilled",
        {
          organizationId: "org-1",
          checkpointId: "cp-1",
          amount: 1000,
        },
        ownerContext,
      ),
    ).rejects.toThrow("CHECKPOINT_NOT_APPROVED");
  });
});

describe("checkpoint.recordPayment", () => {
  it("records payment for billed checkpoint", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "BILLED",
    });
    mockPaymentCreate.mockResolvedValue({ id: "payment-2" });
    const result = await executeAction(
      "checkpoint.recordPayment",
      {
        organizationId: "org-1",
        checkpointId: "cp-1",
        amount: 1500,
        provider: "stripe",
      },
      ownerContext,
    );
    expect(result).toEqual({ paymentId: "payment-2" });
  });

  it("rejects when checkpoint is not billed", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "APPROVED",
    });
    await expect(
      executeAction(
        "checkpoint.recordPayment",
        {
          organizationId: "org-1",
          checkpointId: "cp-1",
          amount: 1000,
        },
        ownerContext,
      ),
    ).rejects.toThrow("CHECKPOINT_NOT_BILLED");
  });
});

describe("handover.create", () => {
  it("creates a human handover", async () => {
    const result = await executeAction(
      "handover.create",
      {
        organizationId: "org-1",
        reason: "PRICE_THRESHOLD",
        riskLevel: "MEDIUM",
        context: { price: 50000 },
      },
      context,
    );
    expect(result).toEqual({ id: "handover-1", status: "OPEN" });
  });
});

describe("handover.resolve", () => {
  it("resolves an open handover", async () => {
    mockHandoverUpdate.mockResolvedValue({ status: "RESOLVED" });
    const result = await executeAction(
      "handover.resolve",
      { organizationId: "org-1", handoverId: "handover-1" },
      context,
    );
    expect(result).toEqual({ status: "RESOLVED" });
  });
});

describe("sourcing.generateBuyerReport", () => {
  it("generates a buyer report from quotes and evidence", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
      title: "Steel sourcing",
      requirement: "500 tons",
      status: "COMPARED",
      currency: "USD",
    });
    mockQuoteFindMany.mockResolvedValue([
      {
        id: "q1",
        supplierCandidate: { name: "Supplier A" },
        totalAmount: 50000,
        unitPrice: 100,
        moq: "10 tons",
        leadTime: "30 days",
        riskScore: 20,
        comparisonRank: 1,
      },
      {
        id: "q2",
        supplierCandidate: { name: "Supplier B" },
        totalAmount: 55000,
        unitPrice: 110,
        moq: "5 tons",
        leadTime: "45 days",
        riskScore: 80,
        comparisonRank: 2,
      },
    ]);
    mockEvidenceFindMany.mockResolvedValue([
      { id: "ev-1", relatedId: "q1" },
    ]);
    const result = await executeAction(
      "sourcing.generateBuyerReport",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    ) as BuyerDecisionReport;
    expect(result.sourcingRunId).toBe("run-1");
    expect(result.quoteTable).toHaveLength(2);
    expect(result.recommendedSupplierName).toBe("Supplier A");
    expect(result.expectedSavings).toBe(5000);
    expect(result.risks).toContain(
      'High risk supplier: Supplier B (risk score: 80)',
    );
  });
});

describe("sourcing.markRunReadyForReview", () => {
  it("marks run as ready for review", async () => {
    mockSourcingUpdate.mockResolvedValue({ status: "READY_FOR_REVIEW" });
    const result = await executeAction(
      "sourcing.markRunReadyForReview",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    );
    expect(result).toEqual({ status: "READY_FOR_REVIEW" });
  });
});

describe("sourcing.deliverBuyerReport", () => {
  it("delivers buyer report", async () => {
    mockSourcingUpdate.mockResolvedValue({ status: "REPORT_DELIVERED" });
    const result = await executeAction(
      "sourcing.deliverBuyerReport",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        summary: "Report summary",
      },
      context,
    );
    expect(result).toEqual({ status: "REPORT_DELIVERED" });
  });
});
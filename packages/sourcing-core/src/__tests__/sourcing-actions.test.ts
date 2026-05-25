import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSourcingFindUnique,
  mockSourcingCreate,
  mockSourcingUpdate,
  mockCandidateFindMany,
  mockCandidateCreate,
  mockCandidateFindUnique,
  mockQuoteCreate,
  mockQuoteFindMany,
  mockQuoteUpdate,
  mockEvidenceFindMany,
  mockEvidenceCount,
  mockEvidenceCreate,
  mockCheckpointFindUnique,
  mockCheckpointCreate,
  mockCheckpointUpdate,
  mockHandoverCreate,
  mockHandoverFindUnique,
  mockHandoverUpdate,
  mockPaymentCreate,
  mockPaymentFindUnique,
  mockLeadFindUnique,
  mockAuditCreate,
  mockOrgFindUnique,
  mockBaselineFindMany,
  mockAltFindMany,
  mockSwitchReportCreate,
  mockSwitchReportFindFirst,
  mockSwitchReportUpdate,
} = vi.hoisted(() => {
  const mockSourcingFindUnique = vi.fn();
  const mockSourcingCreate = vi.fn();
  const mockSourcingUpdate = vi.fn();
  const mockCandidateFindMany = vi.fn();
  const mockCandidateCreate = vi.fn();
  const mockCandidateFindUnique = vi.fn();
  const mockQuoteCreate = vi.fn();
  const mockQuoteFindMany = vi.fn();
  const mockQuoteUpdate = vi.fn();
  const mockEvidenceFindMany = vi.fn();
  const mockEvidenceCount = vi.fn();
  const mockEvidenceCreate = vi.fn();
  const mockCheckpointFindUnique = vi.fn();
  const mockCheckpointCreate = vi.fn();
  const mockCheckpointUpdate = vi.fn();
  const mockHandoverCreate = vi.fn();
  const mockHandoverFindUnique = vi.fn();
  const mockHandoverUpdate = vi.fn();
  const mockPaymentCreate = vi.fn();
  const mockPaymentFindUnique = vi.fn();
  const mockLeadFindUnique = vi.fn();
  const mockAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  const mockOrgFindUnique = vi.fn();
  const mockBaselineFindMany = vi.fn();
  const mockAltFindMany = vi.fn();
  const mockSwitchReportCreate = vi.fn();
  const mockSwitchReportFindFirst = vi.fn();
  const mockSwitchReportUpdate = vi.fn();
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
      findUnique: mockCandidateFindUnique,
    },
    supplierQuote: {
      create: mockQuoteCreate,
      findMany: mockQuoteFindMany,
      update: mockQuoteUpdate,
    },
    evidenceItem: {
      findMany: mockEvidenceFindMany,
      count: mockEvidenceCount,
      create: mockEvidenceCreate,
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
      findUnique: mockPaymentFindUnique,
    },
    lead: {
      findUnique: mockLeadFindUnique,
    },
  };
  return {
    mockSourcingFindUnique,
    mockSourcingCreate,
    mockSourcingUpdate,
    mockCandidateFindMany,
    mockCandidateCreate,
    mockCandidateFindUnique,
    mockQuoteCreate,
    mockQuoteFindMany,
    mockQuoteUpdate,
    mockEvidenceFindMany,
    mockEvidenceCount,
    mockEvidenceCreate,
    mockCheckpointFindUnique,
    mockCheckpointCreate,
    mockCheckpointUpdate,
    mockHandoverCreate,
    mockHandoverFindUnique,
    mockHandoverUpdate,
    mockPaymentCreate,
    mockPaymentFindUnique,
    mockLeadFindUnique,
    mockAuditCreate,
    mockOrgFindUnique,
    mockBaselineFindMany,
    mockAltFindMany,
    mockSwitchReportCreate,
    mockSwitchReportFindFirst,
    mockSwitchReportUpdate,
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
      findUnique: mockCandidateFindUnique,
    },
    supplierQuote: {
      create: mockQuoteCreate,
      findMany: mockQuoteFindMany,
      update: mockQuoteUpdate,
    },
    evidenceItem: {
      findMany: mockEvidenceFindMany,
      count: mockEvidenceCount,
      create: mockEvidenceCreate,
    },
    purchaseBaseline: {
      findMany: mockBaselineFindMany,
    },
    supplierAlternative: {
      findMany: mockAltFindMany,
    },
    switchDecisionReport: {
      create: mockSwitchReportCreate,
      findFirst: mockSwitchReportFindFirst,
      update: mockSwitchReportUpdate,
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
      findUnique: mockPaymentFindUnique,
    },
    lead: {
      findUnique: mockLeadFindUnique,
    },
    $transaction: vi.fn(async (arg: unknown) => {
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
          findUnique: mockCandidateFindUnique,
        },
        supplierQuote: {
          create: mockQuoteCreate,
          findMany: mockQuoteFindMany,
          update: mockQuoteUpdate,
        },
        evidenceItem: {
          findMany: mockEvidenceFindMany,
          count: mockEvidenceCount,
          create: mockEvidenceCreate,
        },
        purchaseBaseline: {
          findMany: mockBaselineFindMany,
        },
        supplierAlternative: {
          findMany: mockAltFindMany,
        },
        switchDecisionReport: {
          create: mockSwitchReportCreate,
          findFirst: mockSwitchReportFindFirst,
          update: mockSwitchReportUpdate,
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
          findUnique: mockPaymentFindUnique,
        },
        lead: {
          findUnique: mockLeadFindUnique,
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
    }),
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
  mockSourcingFindUnique.mockResolvedValue({
    id: "run-1",
    organizationId: "org-1",
  });
  mockSourcingCreate.mockResolvedValue({ id: "run-1", status: "DRAFT" });
  mockSourcingUpdate.mockResolvedValue({ status: "READY_FOR_REVIEW" });
  mockCandidateCreate.mockResolvedValue({ id: "candidate-1" });
  mockCandidateFindMany.mockResolvedValue([]);
  mockQuoteCreate.mockResolvedValue({ id: "quote-1" });
  mockQuoteFindMany.mockResolvedValue([]);
  mockEvidenceFindMany.mockResolvedValue([]);
  mockEvidenceCreate.mockResolvedValue({ id: "evidence-1" });
  mockCheckpointFindUnique.mockResolvedValue({
    id: "cp-1",
    organizationId: "org-1",
    status: "DELIVERED",
    sourcingRunId: "run-1",
  });
  mockCheckpointCreate.mockResolvedValue({ id: "cp-1", status: "PENDING" });
  mockCheckpointUpdate.mockResolvedValue({ status: "DELIVERED" });
  mockHandoverCreate.mockResolvedValue({ id: "handover-1", status: "OPEN" });
  mockHandoverFindUnique.mockResolvedValue({
    id: "handover-1",
    organizationId: "org-1",
  });
  mockHandoverUpdate.mockResolvedValue({ status: "RESOLVED" });
  mockPaymentCreate.mockResolvedValue({ id: "payment-1" });
  mockPaymentFindUnique.mockResolvedValue(null);
  mockLeadFindUnique.mockResolvedValue({
    id: "lead-1",
    organizationId: "org-1",
  });
  mockCandidateFindUnique.mockResolvedValue({
    id: "candidate-1",
    organizationId: "org-1",
    sourcingRunId: "run-1",
  });
  mockBaselineFindMany.mockResolvedValue([]);
  mockAltFindMany.mockResolvedValue([]);
  mockEvidenceCount.mockResolvedValue(0);
  mockSwitchReportCreate.mockResolvedValue({
    id: "report-1",
    recommendation: "WAIT",
    confidence: "LOW",
    overallScore: 0,
    monthlySavings: null,
    annualSavings: null,
    savingsPercent: null,
    currency: "USD",
    summary: "No data",
    nextActions: [],
  });
  mockSwitchReportFindFirst.mockResolvedValue(null);
  mockSwitchReportUpdate.mockResolvedValue({ id: "report-1" });
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
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
    });
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
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-2",
    });
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
    const result = (await executeAction(
      "sourcing.compareQuotes",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as { quoteCount: number; bestPriceQuoteId: string | null };
    expect(result.quoteCount).toBe(0);
  });

  it("ranks quotes when multiple exist", async () => {
    mockQuoteFindMany.mockResolvedValue([
      { id: "q1", totalAmount: 500, riskScore: 30 },
      { id: "q2", totalAmount: 300, riskScore: 70 },
    ]);
    const result = (await executeAction(
      "sourcing.compareQuotes",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as { quoteCount: number; bestPriceQuoteId: string | null };
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
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
    });
    mockCheckpointUpdate.mockResolvedValue({ status: "DELIVERED" });
    const result = await executeAction(
      "checkpoint.markDelivered",
      { organizationId: "org-1", checkpointId: "cp-1" },
      context,
    );
    expect(result).toEqual({ status: "DELIVERED" });
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

  it("returns existing payment id on duplicate externalPaymentId", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "BILLED",
    });
    mockPaymentFindUnique.mockResolvedValue({ id: "payment-existing" });
    const result = await executeAction(
      "checkpoint.recordPayment",
      {
        organizationId: "org-1",
        checkpointId: "cp-1",
        amount: 1500,
        provider: "stripe",
        externalPaymentId: "pi_123",
      },
      ownerContext,
    );
    expect(result).toEqual({ paymentId: "payment-existing" });
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });
});

describe("checkpoint.approveForBilling", () => {
  it("rejects when checkpoint has no evidence", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "DELIVERED",
      sourcingRunId: "run-1",
    });
    mockEvidenceCount.mockResolvedValueOnce(0);
    await expect(
      executeAction(
        "checkpoint.approveForBilling",
        { organizationId: "org-1", checkpointId: "cp-1" },
        ownerContext,
      ),
    ).rejects.toThrow("CHECKPOINT_EVIDENCE_REQUIRED");
  });

  it("approves checkpoint with evidence present", async () => {
    mockCheckpointFindUnique.mockResolvedValue({
      id: "cp-1",
      organizationId: "org-1",
      status: "DELIVERED",
      sourcingRunId: "run-1",
    });
    mockCheckpointUpdate.mockResolvedValue({ status: "APPROVED" });
    mockEvidenceCount.mockResolvedValue(5);
    const result = await executeAction(
      "checkpoint.approveForBilling",
      { organizationId: "org-1", checkpointId: "cp-1" },
      ownerContext,
    );
    expect(result).toEqual({ status: "APPROVED" });
  });
});

describe("sourcing.createRun — cross-tenant validation", () => {
  it("rejects when leadId belongs to another org", async () => {
    mockLeadFindUnique.mockResolvedValue({
      id: "lead-1",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "sourcing.createRun",
        {
          organizationId: "org-1",
          title: "Find suppliers",
          requirement: "Need parts",
          leadId: "lead-1",
        },
        context,
      ),
    ).rejects.toThrow();
  });
});

describe("sourcing.addSupplierQuote — cross-tenant validation", () => {
  it("rejects when supplierCandidateId belongs to another org", async () => {
    mockCandidateFindUnique.mockResolvedValue({
      id: "candidate-1",
      organizationId: "org-2",
      sourcingRunId: "run-1",
    });
    await expect(
      executeAction(
        "sourcing.addSupplierQuote",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          productDescription: "Steel",
          supplierCandidateId: "candidate-1",
        },
        context,
      ),
    ).rejects.toThrow();
  });

  it("rejects when supplierCandidateId belongs to a different run", async () => {
    mockCandidateFindUnique.mockResolvedValue({
      id: "candidate-1",
      organizationId: "org-1",
      sourcingRunId: "run-other",
    });
    await expect(
      executeAction(
        "sourcing.addSupplierQuote",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          productDescription: "Steel",
          supplierCandidateId: "candidate-1",
        },
        context,
      ),
    ).rejects.toThrow("SUPPLIER_CANDIDATE_RUN_MISMATCH");
  });
});

describe("checkpoint.create — tenant validation", () => {
  it("accepts checkpoint with valid sourcingRunId", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
    });
    const result = await executeAction(
      "checkpoint.create",
      {
        organizationId: "org-1",
        title: "Quote Collection",
        checkpointType: "QUOTE_COLLECTION",
        sourcingRunId: "run-1",
      },
      context,
    );
    expect(result).toEqual({ id: "cp-1", status: "PENDING" });
  });

  it("rejects when sourcingRunId belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "checkpoint.create",
        {
          organizationId: "org-1",
          title: "Quote Collection",
          checkpointType: "QUOTE_COLLECTION",
          sourcingRunId: "run-1",
        },
        context,
      ),
    ).rejects.toThrow();
  });
});

describe("handover.create — tenant validation", () => {
  it("accepts handover with valid sourcingRunId", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
    });
    const result = await executeAction(
      "handover.create",
      {
        organizationId: "org-1",
        reason: "PRICE_THRESHOLD",
        riskLevel: "MEDIUM",
        context: { price: 50000 },
        sourcingRunId: "run-1",
      },
      context,
    );
    expect(result).toEqual({ id: "handover-1", status: "OPEN" });
  });

  it("rejects when sourcingRunId belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "handover.create",
        {
          organizationId: "org-1",
          reason: "PRICE_THRESHOLD",
          riskLevel: "MEDIUM",
          context: { price: 50000 },
          sourcingRunId: "run-1",
        },
        context,
      ),
    ).rejects.toThrow();
  });
});

describe("generateBuyerReport — risk logic", () => {
  it("does not flag COMPARED status as risk", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
      title: "Test",
      requirement: "N/A",
      status: "COMPARED",
      currency: "USD",
    });
    mockQuoteFindMany.mockResolvedValue([
      {
        id: "q1",
        supplierCandidate: { name: "A" },
        totalAmount: 1000,
        riskScore: 10,
        comparisonRank: 1,
        moq: "1",
        leadTime: "10",
        shippingTerm: "FOB",
        paymentTerm: "TT",
      },
    ]);
    mockEvidenceFindMany.mockResolvedValue([]);
    mockEvidenceCount.mockResolvedValue(5);
    const result = (await executeAction(
      "sourcing.generateBuyerReport",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as any;
    const riskMessages = result.risks.map((r: string) => r);
    expect(riskMessages).not.toContain(
      "Sourcing run has not been delivered as complete",
    );
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
    mockEvidenceFindMany.mockResolvedValue([{ id: "ev-1", relatedId: "q1" }]);
    const result = (await executeAction(
      "sourcing.generateBuyerReport",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as BuyerDecisionReport;
    expect(result.sourcingRunId).toBe("run-1");
    expect(result.quoteTable).toHaveLength(2);
    expect(result.recommendedSupplierName).toBe("Supplier A");
    expect(result.expectedSavings).toBe(5000);
    expect(result.risks).toContain(
      "High risk supplier: Supplier B (risk score: 80)",
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
  it("delivers buyer report and creates BUYER_DECISION evidence", async () => {
    mockSourcingUpdate.mockResolvedValue({ status: "REPORT_DELIVERED" });
    mockEvidenceCreate.mockResolvedValue({ id: "evidence-1" });
    const result = await executeAction(
      "sourcing.deliverBuyerReport",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        summary: "Report summary",
        recommendedSupplierName: "Supplier A",
        expectedSavings: 5000,
        currency: "USD",
        risks: ["Risk 1"],
        missingInformation: ["Missing 1"],
        nextActions: ["Action 1"],
      },
      context,
    );
    expect(result).toEqual({
      status: "REPORT_DELIVERED",
      evidenceId: "evidence-1",
    });
    expect(mockEvidenceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          sourcingRunId: "run-1",
          evidenceType: "BUYER_DECISION",
          title: "Report summary",
        }),
      }),
    );
  });

  it("rejects when sourcing run belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-other",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "sourcing.deliverBuyerReport",
        {
          organizationId: "org-1",
          sourcingRunId: "run-other",
          summary: "Test",
        },
        context,
      ),
    ).rejects.toThrow("SOURCING_RUN_BELONGS_TO_ANOTHER_ORGANIZATION");
  });
});

describe("sourcing.generateSwitchDecision", () => {
  it("generates WAIT report when no baseline or alternatives exist", async () => {
    mockBaselineFindMany.mockResolvedValue([]);
    mockAltFindMany.mockResolvedValue([]);
    mockEvidenceCount.mockResolvedValue(0);
    mockSwitchReportCreate.mockResolvedValue({
      id: "report-1",
      recommendation: "WAIT",
      confidence: "LOW",
      overallScore: 0,
      monthlySavings: null,
      annualSavings: null,
      savingsPercent: null,
      currency: "USD",
      summary: "No data",
      nextActions: [],
    });
    const result = (await executeAction(
      "sourcing.generateSwitchDecision",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as { recommendation: string; overallScore: number };
    expect(result.recommendation).toBe("WAIT");
    expect(result.overallScore).toBe(0);
  });

  it("generates SWITCH report when strong savings and evidence exist", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-1",
      organizationId: "org-1",
      currency: "USD",
    });
    mockBaselineFindMany.mockResolvedValue([
      {
        id: "bl-1",
        unitPrice: 100,
        quantity: 10,
        currency: "USD",
        paymentTerms: "net30",
        leadTime: "30 days",
        frequency: "monthly",
        organizationId: "org-1",
        sourcingRunId: "run-1",
      },
    ]);
    mockAltFindMany.mockResolvedValue([
      {
        id: "alt-1",
        unitPrice: 65,
        totalCost: 650,
        currency: "USD",
        leadTime: "20 days",
        paymentTerm: "net30",
        organizationId: "org-1",
        sourcingRunId: "run-1",
      },
      {
        id: "alt-2",
        unitPrice: 70,
        totalCost: 700,
        currency: "USD",
        leadTime: "25 days",
        paymentTerm: "net30",
        organizationId: "org-1",
        sourcingRunId: "run-1",
      },
    ]);
    mockEvidenceCount.mockResolvedValue(3);
    mockSwitchReportCreate.mockResolvedValue({
      id: "report-2",
      recommendation: "SWITCH",
      confidence: "HIGH",
      overallScore: 78,
      monthlySavings: 350,
      annualSavings: 4200,
      savingsPercent: 35,
      currency: "USD",
      summary:
        "Recommendation: SWITCH | Monthly savings: $350 | Annual savings: $4,200 | Savings: 35.0%",
      nextActions: ["Prepare buyer approval request for supplier switch"],
    });
    const result = (await executeAction(
      "sourcing.generateSwitchDecision",
      { organizationId: "org-1", sourcingRunId: "run-1" },
      context,
    )) as {
      recommendation: string;
      overallScore: number;
      monthlySavings: number;
    };
    expect(result.recommendation).toBe("SWITCH");
    expect(result.overallScore).toBeGreaterThanOrEqual(60);
    expect(result.monthlySavings).toBe(350);
  });

  it("rejects when sourcing run belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-other",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "sourcing.generateSwitchDecision",
        { organizationId: "org-1", sourcingRunId: "run-other" },
        context,
      ),
    ).rejects.toThrow("SOURCING_RUN_BELONGS_TO_ANOTHER_ORGANIZATION");
  });
});

describe("sourcing.submitBuyerDecision", () => {
  it("rejects when no report exists", async () => {
    mockSwitchReportFindFirst.mockResolvedValue(null);
    await expect(
      executeAction(
        "sourcing.submitBuyerDecision",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          decision: "APPROVE",
        },
        context,
      ),
    ).rejects.toThrow("NO_SWITCH_DECISION_REPORT");
  });

  it("records APPROVE decision and creates evidence", async () => {
    mockSwitchReportFindFirst.mockResolvedValue({
      id: "report-1",
      recommendation: "SWITCH",
    });
    mockSwitchReportUpdate.mockResolvedValue({ id: "report-1" });
    mockEvidenceCreate.mockResolvedValue({ id: "evidence-1" });
    const result = (await executeAction(
      "sourcing.submitBuyerDecision",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        decision: "APPROVE",
        notes: "Looks good, proceed",
      },
      context,
    )) as { reportId: string; decision: string; evidenceId: string };
    expect(result.decision).toBe("APPROVE");
    expect(result.evidenceId).toBe("evidence-1");
    expect(mockSwitchReportUpdate).toHaveBeenCalled();
    expect(mockEvidenceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceType: "BUYER_DECISION",
          title: "Buyer decision: APPROVE",
        }),
      }),
    );
  });

  it("rejects APPROVE when recommendation is not SWITCH", async () => {
    mockSwitchReportFindFirst.mockResolvedValue({
      id: "report-1",
      recommendation: "WAIT",
    });
    await expect(
      executeAction(
        "sourcing.submitBuyerDecision",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          decision: "APPROVE",
        },
        context,
      ),
    ).rejects.toThrow("CANNOT_APPROVE_NON_SWITCH_RECOMMENDATION");
  });

  it("records REQUEST_MORE_PROOF on any recommendation", async () => {
    mockSwitchReportFindFirst.mockResolvedValue({
      id: "report-1",
      recommendation: "NEGOTIATE",
    });
    mockSwitchReportUpdate.mockResolvedValue({ id: "report-1" });
    mockEvidenceCreate.mockResolvedValue({ id: "evidence-2" });
    const result = (await executeAction(
      "sourcing.submitBuyerDecision",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        decision: "REQUEST_MORE_PROOF",
      },
      context,
    )) as { decision: string };
    expect(result.decision).toBe("REQUEST_MORE_PROOF");
  });

  it("records REJECT on any recommendation", async () => {
    mockSwitchReportFindFirst.mockResolvedValue({
      id: "report-1",
      recommendation: "SWITCH",
    });
    mockSwitchReportUpdate.mockResolvedValue({ id: "report-1" });
    mockEvidenceCreate.mockResolvedValue({ id: "evidence-3" });
    const result = (await executeAction(
      "sourcing.submitBuyerDecision",
      {
        organizationId: "org-1",
        sourcingRunId: "run-1",
        decision: "REJECT",
      },
      context,
    )) as { decision: string };
    expect(result.decision).toBe("REJECT");
  });

  it("rejects when sourcing run belongs to another org", async () => {
    mockSourcingFindUnique.mockResolvedValue({
      id: "run-other",
      organizationId: "org-2",
    });
    await expect(
      executeAction(
        "sourcing.submitBuyerDecision",
        {
          organizationId: "org-1",
          sourcingRunId: "run-other",
          decision: "REJECT",
        },
        context,
      ),
    ).rejects.toThrow("SOURCING_RUN_BELONGS_TO_ANOTHER_ORGANIZATION");
  });

  it("rejects when report belongs to another org (findFirst returns null)", async () => {
    mockSwitchReportFindFirst.mockResolvedValue(null);
    await expect(
      executeAction(
        "sourcing.submitBuyerDecision",
        {
          organizationId: "org-1",
          sourcingRunId: "run-1",
          decision: "REQUEST_MORE_PROOF",
        },
        context,
      ),
    ).rejects.toThrow("NO_SWITCH_DECISION_REPORT");
  });
});

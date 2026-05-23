import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuditCreate,
  mockReportSnapshotCreate,
  mockReportSnapshotFindUnique,
  mockReportSnapshotUpdate,
  mockWebhookCount,
  mockLeadCount,
  mockLeadFindMany,
  mockQuotationCount,
  mockQuotationFindMany,
  mockOrganizationFindUnique,
  mockUserFindMany,
  mockWebhookFindMany,
  mockAiUsageFindMany,
  mockReportSnapshotFindMany,
  mockWebhookIntegrationFindMany,
  mockCompanyCount,
  mockProductCount,
  mockTaskCount,
  mockApprovalCount,
  mockJobCount,
  mockConversationFindMany,
  mockMessageCount,
  mockCompanyFindMany,
  mockProductFindMany,
  tx,
} = vi.hoisted(() => {
  const mockAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  const mockReportSnapshotCreate = vi.fn();
  const mockReportSnapshotFindUnique = vi.fn();
  const mockReportSnapshotUpdate = vi.fn();
  const mockWebhookCount = vi.fn();
  const mockLeadCount = vi.fn();
  const mockLeadFindMany = vi.fn();
  const mockQuotationCount = vi.fn();
  const mockQuotationFindMany = vi.fn();
  const mockOrganizationFindUnique = vi.fn();
  const mockUserFindMany = vi.fn();
  const mockWebhookFindMany = vi.fn();
  const mockAiUsageFindMany = vi.fn();
  const mockReportSnapshotFindMany = vi.fn();
  const mockWebhookIntegrationFindMany = vi.fn();
  const mockCompanyCount = vi.fn();
  const mockProductCount = vi.fn();
  const mockTaskCount = vi.fn();
  const mockApprovalCount = vi.fn();
  const mockJobCount = vi.fn();
  const mockConversationFindMany = vi.fn();
  const mockMessageCount = vi.fn();
  const mockCompanyFindMany = vi.fn();
  const mockProductFindMany = vi.fn();
  const tx = {
    auditLog: {
      create: mockAuditCreate,
      findMany: vi.fn().mockResolvedValue([]),
    },
    reportSnapshot: {
      create: mockReportSnapshotCreate,
      findUnique: mockReportSnapshotFindUnique,
      update: mockReportSnapshotUpdate,
      findMany: mockReportSnapshotFindMany,
      count: vi.fn().mockResolvedValue(0),
    },
    webhookEvent: { count: mockWebhookCount, findMany: mockWebhookFindMany },
    lead: { count: mockLeadCount, findMany: mockLeadFindMany },
    quotation: { count: mockQuotationCount, findMany: mockQuotationFindMany },
    organization: { findUnique: mockOrganizationFindUnique },
    user: { findMany: mockUserFindMany, count: vi.fn().mockResolvedValue(0) },
    aiUsageEvent: {
      findMany: mockAiUsageFindMany,
      count: vi.fn().mockResolvedValue(0),
    },
    webhookIntegration: {
      findMany: mockWebhookIntegrationFindMany,
      count: vi.fn().mockResolvedValue(0),
    },
    company: { findMany: mockCompanyFindMany, count: mockCompanyCount },
    contact: { findMany: vi.fn().mockResolvedValue([]) },
    product: { findMany: mockProductFindMany, count: mockProductCount },
    conversation: { findMany: mockConversationFindMany },
    message: {
      findMany: vi.fn().mockResolvedValue([]),
      count: mockMessageCount,
    },
    task: { findMany: vi.fn().mockResolvedValue([]), count: mockTaskCount },
    approvalRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      count: mockApprovalCount,
    },
    job: { count: mockJobCount },
  };
  return {
    mockAuditCreate,
    mockReportSnapshotCreate,
    mockReportSnapshotFindUnique,
    mockReportSnapshotUpdate,
    mockWebhookCount,
    mockLeadCount,
    mockLeadFindMany,
    mockQuotationCount,
    mockQuotationFindMany,
    mockOrganizationFindUnique,
    mockUserFindMany,
    mockWebhookFindMany,
    mockAiUsageFindMany,
    mockReportSnapshotFindMany,
    mockWebhookIntegrationFindMany,
    mockCompanyCount,
    mockProductCount,
    mockTaskCount,
    mockApprovalCount,
    mockJobCount,
    mockConversationFindMany,
    mockMessageCount,
    mockCompanyFindMany,
    mockProductFindMany,
    tx,
  };
});

vi.mock("@tradeos/database", () => ({
  prisma: {
    ...tx,
    $transaction: vi.fn((cb: (client: unknown) => unknown) => cb(tx)),
  },
}));

import { isActionMfaRequired } from "@tradeos/policy-core";
import {
  approveSnapshot,
  createWeeklySnapshot,
  exportBillingUsage,
  exportTenantData,
  getDashboardMetrics,
  getFunnelMetrics,
  getBillingMetrics,
  getPlanLimits,
  generateWeeklyReport,
} from "../index";

const context = {
  actorUserId: "user-1",
  organizationId: "org-1",
  role: "ADMIN" as const,
  source: "manual" as const,
  mfaLevel: "aal2",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditCreate.mockResolvedValue({ id: "audit-1" });
  mockWebhookCount.mockResolvedValue(0);
  mockLeadCount.mockResolvedValue(0);
  mockLeadFindMany.mockResolvedValue([]);
  mockQuotationCount.mockResolvedValue(0);
  mockQuotationFindMany.mockResolvedValue([]);
  mockOrganizationFindUnique.mockResolvedValue({
    name: "Org",
    plan: "TEAM",
    aiMonthlyBudget: 50,
  });
  mockUserFindMany.mockResolvedValue([]);
  mockWebhookFindMany.mockResolvedValue([]);
  mockAiUsageFindMany.mockResolvedValue([]);
  mockReportSnapshotFindMany.mockResolvedValue([]);
  mockWebhookIntegrationFindMany.mockResolvedValue([]);
  mockCompanyCount.mockResolvedValue(0);
  mockProductCount.mockResolvedValue(0);
  mockTaskCount.mockResolvedValue(0);
  mockApprovalCount.mockResolvedValue(0);
  mockJobCount.mockResolvedValue(0);
  mockMessageCount.mockResolvedValue(0);
  mockConversationFindMany.mockResolvedValue([]);
});

describe("analytics-core registered actions", () => {
  it("creates weekly snapshots through policy-core audit transaction", async () => {
    mockReportSnapshotCreate.mockResolvedValue({
      id: "snapshot-1",
      status: "DRAFT",
    });

    const result = await createWeeklySnapshot("org-1", context);

    expect(result).toEqual({ id: "snapshot-1", status: "DRAFT" });
    expect(mockReportSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          reportType: "weekly",
        }),
      }),
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionName: "report.snapshotCreate" }),
      }),
    );
  });

  it("approves only snapshots in the same organization", async () => {
    mockReportSnapshotFindUnique.mockResolvedValue({
      id: "snapshot-1",
      organizationId: "org-2",
      status: "DRAFT",
    });

    await expect(
      approveSnapshot("snapshot-1", "org-1", context),
    ).rejects.toThrow("SNAPSHOT_ACCESS_DENIED");
    expect(mockReportSnapshotUpdate).not.toHaveBeenCalled();
  });

  it("enforces AAL2 MFA for billing and privacy exports via policy-core", async () => {
    expect(isActionMfaRequired("billing.export")).toBe(true);
    expect(isActionMfaRequired("privacy.export")).toBe(true);

    await expect(
      exportBillingUsage("org-1", { ...context, mfaLevel: "aal1" }),
    ).rejects.toThrow("MFA_REQUIRED");
    await expect(
      exportTenantData("org-1", { ...context, mfaLevel: "aal1" }),
    ).rejects.toThrow("MFA_REQUIRED");
  });

  it("exports billing summary through a registered action audit path", async () => {
    const result = (await exportBillingUsage("org-1", context)) as {
      summary: { userCount: number };
    };

    expect(result.summary.userCount).toBe(0);
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionName: "billing.export",
          result: expect.objectContaining({ summary: expect.any(Object) }),
        }),
      }),
    );
  });
});

describe("getDashboardMetrics", () => {
  it("returns correct lead, company, product counts", async () => {
    mockLeadCount.mockResolvedValue(10);
    mockCompanyCount.mockResolvedValue(5);
    mockProductCount.mockResolvedValue(8);
    mockQuotationCount.mockResolvedValue(3);
    mockTaskCount.mockResolvedValue(7);
    mockApprovalCount.mockResolvedValue(2);
    mockWebhookCount.mockResolvedValue(15);
    mockJobCount.mockResolvedValue(1);

    const result = await getDashboardMetrics("org-1");

    expect(result.leadCount).toBe(10);
    expect(result.companyCount).toBe(5);
    expect(result.productCount).toBe(8);
    expect(result.quotationCount).toBe(3);
    expect(result.taskCount).toBe(7);
    expect(result.pendingApprovalCount).toBe(2);
    expect(result.webhookEventCount).toBe(15);
    expect(result.pendingJobCount).toBe(1);
  });

  it("returns response time and stale lead counts", async () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    mockLeadFindMany.mockResolvedValue([
      { id: "lead-1", createdAt: fiveDaysAgo },
      { id: "lead-2", createdAt: fiveDaysAgo },
    ]);
    mockQuotationFindMany.mockResolvedValue([
      {
        leadId: "lead-1",
        createdAt: new Date(fiveDaysAgo.getTime() + 3600000),
      },
      {
        leadId: "lead-2",
        createdAt: new Date(fiveDaysAgo.getTime() + 7200000),
      },
    ]);
    mockLeadCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.updatedAt?.lt) return 3;
      if (where.status?.notIn) return 3;
      return 0;
    });

    const result = await getDashboardMetrics("org-1");

    expect(result.staleLeadCount).toBe(3);
    expect(result.averageResponseTimeHours).toBeGreaterThan(0);
    expect(result.responseTimeLabel).toContain("h avg");
  });

  it("returns zeros for empty organization without error", async () => {
    mockOrganizationFindUnique.mockResolvedValue(null);

    const result = await getDashboardMetrics("org-empty");

    expect(result.leadCount).toBe(0);
    expect(result.companyCount).toBe(0);
    expect(result.productCount).toBe(0);
    expect(result.quotationCount).toBe(0);
    expect(result.taskCount).toBe(0);
    expect(result.pendingApprovalCount).toBe(0);
    expect(result.staleLeadCount).toBe(0);
    expect(result.averageResponseTimeHours).toBeNull();
    expect(result.responseTimeLabel).toBe("unavailable");
    expect(result.aiBudget).toBe(0);
  });

  it("returns ai budget from organization plan", async () => {
    mockOrganizationFindUnique.mockResolvedValue({ aiMonthlyBudget: 100 });

    const result = await getDashboardMetrics("org-1");

    expect(result.aiBudget).toBe(100);
  });
});

describe("getFunnelMetrics", () => {
  it("returns funnel stages with correct counts", async () => {
    mockWebhookCount.mockResolvedValue(50);
    mockMessageCount.mockResolvedValue(30);
    mockLeadCount.mockResolvedValue(15);
    mockTaskCount.mockResolvedValue(10);
    mockQuotationCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.status === "SENT") return 5;
      return 8;
    });
    mockOrganizationFindUnique.mockResolvedValue({
      avgDealValue: 1000,
      conversionRate: 0.3,
    });

    const result = await getFunnelMetrics("org-1");

    expect(result.stages).toHaveLength(6);
    expect(result.stages[0]).toMatchObject({
      label: "Inbound Events",
      count: 50,
      percentage: 100,
    });
    expect(result.stages[4]).toMatchObject({
      label: "Quotations Drafted",
      count: 8,
    });
    expect(result.stages[5]).toMatchObject({
      label: "Quotations Sent",
      count: 5,
    });
  });

  it("computes stale value estimate from avg deal value and conversion", async () => {
    mockLeadCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.updatedAt?.lt) return 4;
      return 0;
    });
    mockOrganizationFindUnique.mockResolvedValue({
      avgDealValue: 5000,
      conversionRate: 0.25,
    });

    const result = await getFunnelMetrics("org-1");

    expect(result.staleValueEstimate).toBe(4 * 5000 * 0.25);
    expect(result.staleValueCurrency).toBe("USD");
  });

  it("returns zero percentages when inbound count is zero", async () => {
    mockWebhookCount.mockResolvedValue(0);

    const result = await getFunnelMetrics("org-1");

    expect(result.stages[0]).toMatchObject({ count: 0, percentage: 100 });
    for (let i = 1; i < result.stages.length; i++) {
      expect(result.stages[i].count).toBe(0);
      expect(result.stages[i].percentage).toBe(0);
    }
  });
});

describe("getBillingMetrics", () => {
  it("returns billing data with plan limits", async () => {
    mockOrganizationFindUnique.mockResolvedValue({ plan: "TEAM" });

    const result = await getBillingMetrics("org-1");

    expect(result.plan).toBe("TEAM");
    expect(result.userCount).toBe(0);
    expect(result.dimensions).toHaveLength(4);
    expect(result.dimensions[0]).toMatchObject({
      dimension: "seats",
      limit: 10,
    });
  });

  it("returns FREE plan when org not found", async () => {
    mockOrganizationFindUnique.mockResolvedValue(null);

    const result = await getBillingMetrics("org-missing");

    expect(result.plan).toBe("FREE");
    expect(result.dimensions[0].limit).toBe(1);
  });

  it("flags exceeded dimensions", async () => {
    mockOrganizationFindUnique.mockResolvedValue({ plan: "FREE" });
    vi.mocked(tx.user.count).mockResolvedValue(5);

    const result = await getBillingMetrics("org-1");

    const seatsDim = result.dimensions.find((d) => d.dimension === "seats")!;
    expect(seatsDim.exceeded).toBe(true);
  });
});

describe("getPlanLimits", () => {
  it("returns correct limits for TEAM plan", () => {
    const limits = getPlanLimits("TEAM");
    expect(limits.seats).toBe(10);
    expect(limits.monthlyInbound).toBe(10000);
    expect(limits.aiBudget).toBe(50);
    expect(limits.integrations).toBe(3);
    expect(limits.snapshots).toBe(20);
  });

  it("returns FREE limits for unknown plan", () => {
    const limits = getPlanLimits("UNKNOWN");
    expect(limits.seats).toBe(1);
    expect(limits.aiBudget).toBe(0);
  });

  it("returns unlimited for ENTERPRISE", () => {
    const limits = getPlanLimits("ENTERPRISE");
    expect(limits.seats).toBe(Infinity);
    expect(limits.monthlyInbound).toBe(Infinity);
  });
});

describe("generateWeeklyReport", () => {
  it("returns report with sections and org id", async () => {
    const report = await generateWeeklyReport("org-1");

    expect(report.organizationId).toBe("org-1");
    expect(report.periodStart).toBeTruthy();
    expect(report.periodEnd).toBeTruthy();
    expect(report.generatedAt).toBeTruthy();
    expect(report.inboundVolume).toBe(0);
    expect(report.quotationVolume).toBe(0);
    expect(report.dataPrivacyNote).toContain("aggregate metrics only");
  });

  it("returns top demand categories from lead needs", async () => {
    mockLeadFindMany.mockResolvedValue([
      { need: "Looking for rice and coffee" },
      { need: "Need rice supplier" },
      { need: "Exporting cashew nuts" },
    ]);
    mockWebhookCount.mockResolvedValue(10);

    const report = await generateWeeklyReport("org-1");

    expect(report.topDemandCategories.length).toBeGreaterThanOrEqual(2);
    const rice = report.topDemandCategories.find((c) => c.category === "rice");
    expect(rice).toBeDefined();
    expect(rice!.count).toBe(2);
  });

  it("returns unavailable response speed when no recent leads", async () => {
    const report = await generateWeeklyReport("org-1");

    expect(report.responseSpeedHours).toBeNull();
    expect(report.responseSpeedLabel).toBe("unavailable");
  });

  it("returns stale lead count", async () => {
    mockLeadCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.updatedAt?.lt) return 5;
      return 0;
    });

    const report = await generateWeeklyReport("org-1");

    expect(report.staleLeadCount).toBe(5);
  });

  it("returns quotation volume counts", async () => {
    mockWebhookCount.mockResolvedValue(10);
    mockQuotationCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.status === "SENT") return 4;
      return 7;
    });

    const report = await generateWeeklyReport("org-1");

    expect(report.quotationVolume).toBe(7);
    expect(report.quotationSentVolume).toBe(4);
  });
});

describe("getDashboardMetrics webhooks, jobs, AI", () => {
  it("returns webhook failure and 24h counts", async () => {
    mockWebhookCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.status === "FAILED") return 3;
      if (where.receivedAt?.gte) return 20;
      return 50;
    });

    const result = await getDashboardMetrics("org-1");

    expect(result.webhookEventCount).toBe(50);
    expect(result.webhookFailureCount).toBe(3);
    expect(result.webhookTotal24h).toBe(20);
  });

  it("returns pending and failed job counts", async () => {
    mockJobCount.mockImplementation((args: unknown) => {
      const where = (args as any)?.where ?? {};
      if (where.status === "PENDING") return 5;
      if (where.status === "FAILED") return 2;
      return 0;
    });

    const result = await getDashboardMetrics("org-1");

    expect(result.pendingJobCount).toBe(5);
    expect(result.failedJob24hCount).toBe(2);
  });

  it("returns AI spend and call counts for the month", async () => {
    mockAiUsageFindMany.mockResolvedValue([
      { estimatedCost: 10.5 },
      { estimatedCost: 5.25 },
    ]);
    vi.mocked(tx.aiUsageEvent.count).mockResolvedValue(2);

    const result = await getDashboardMetrics("org-1");

    expect(result.aiTotalSpendMonth).toBe(15.75);
    expect(result.aiCallCountMonth).toBe(2);
  });
});

describe("getFunnelMetrics channel response times", () => {
  it("returns response time by channel", async () => {
    const now = new Date();
    mockLeadFindMany.mockResolvedValue([
      {
        id: "lead-r1",
        source: "EMAIL",
        createdAt: new Date(now.getTime() - 7200000),
      },
    ]);
    mockQuotationFindMany.mockResolvedValue([
      { leadId: "lead-r1", createdAt: now },
    ]);
    mockWebhookCount.mockResolvedValue(5);
    mockMessageCount.mockResolvedValue(3);
    mockLeadCount.mockResolvedValue(1);
    mockTaskCount.mockResolvedValue(0);
    mockOrganizationFindUnique.mockResolvedValue(null);

    const result = await getFunnelMetrics("org-1");

    expect(result.responseTimeByChannel).toHaveLength(1);
    expect(result.responseTimeByChannel[0].channel).toBe("EMAIL");
    expect(result.responseTimeByChannel[0].avgHours).toBeGreaterThan(0);
  });

  it("returns empty channel response times when no leads with quotes", async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockWebhookCount.mockResolvedValue(0);

    const result = await getFunnelMetrics("org-1");

    expect(result.responseTimeByChannel).toHaveLength(0);
  });
});

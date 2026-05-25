import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  executeAction,
  registerAction,
  type ActionContext,
} from "@tradeos/policy-core";
import { z, ZodError } from "zod";

function safeParse<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("INVALID_REQUEST_BODY");
    }
    throw error;
  }
}
import "@tradeos/crm-core";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

export type DashboardMetrics = {
  leadCount: number;
  companyCount: number;
  quotationCount: number;
  taskCount: number;
  pendingApprovalCount: number;
  webhookEventCount: number;
  productCount: number;
  staleLeadCount: number;
  averageResponseTimeHours: number | null;
  responseTimeLabel: string;
  webhookFailureCount: number;
  webhookTotal24h: number;
  pendingJobCount: number;
  failedJob24hCount: number;
  aiTotalSpendMonth: number;
  aiCallCountMonth: number;
  aiBudget: number;
};

export async function getDashboardMetrics(
  organizationId: string,
): Promise<DashboardMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const twentyFourHoursAgo = new Date(now.getTime() - ONE_DAY_MS);

  const [
    leadCount,
    companyCount,
    quotationCount,
    taskCount,
    pendingApprovalCount,
    webhookEventCount,
    productCount,
    staleLeadCount,
    recentLeads,
    webhookFailureCount,
    webhookTotal24h,
    pendingJobCount,
    failedJob24hCount,
    aiTotalSpendMonth,
    aiCallCountMonth,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.company.count({ where: { organizationId } }),
    prisma.quotation.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId } }),
    prisma.approvalRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    prisma.webhookEvent.count({ where: { organizationId } }),
    prisma.product.count({ where: { organizationId } }),
    prisma.lead.count({
      where: {
        organizationId,
        updatedAt: { lt: sevenDaysAgo },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, createdAt: true },
    }),
    prisma.webhookEvent.count({
      where: {
        organizationId,
        status: "FAILED",
        receivedAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.webhookEvent.count({
      where: { organizationId, receivedAt: { gte: twentyFourHoursAgo } },
    }),
    prisma.job.count({
      where: { organizationId, status: "PENDING", nextRunAt: { lte: now } },
    }),
    prisma.job.count({
      where: {
        organizationId,
        status: "FAILED",
        updatedAt: { gte: twentyFourHoursAgo },
      },
    }),
    (async () => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const rows = await prisma.aiUsageEvent.findMany({
        where: { organizationId, createdAt: { gte: monthStart } },
        select: { estimatedCost: true },
      });
      return rows.reduce((sum, r) => sum + Number(r.estimatedCost), 0);
    })(),
    prisma.aiUsageEvent.count({
      where: {
        organizationId,
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
  ]);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiMonthlyBudget: true },
  });

  let averageResponseTimeHours: number | null = null;
  let responseTimeLabel = "unavailable";

  if (recentLeads.length > 0) {
    const leadIds = recentLeads.map((l) => l.id);
    const quotations = await prisma.quotation.findMany({
      where: { organizationId, leadId: { in: leadIds } },
      select: { leadId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const firstQuoteByLead = new Map<string, Date>();
    for (const q of quotations) {
      if (q.leadId && !firstQuoteByLead.has(q.leadId)) {
        firstQuoteByLead.set(q.leadId, q.createdAt);
      }
    }

    const responseTimes: number[] = [];
    for (const lead of recentLeads) {
      const firstQuote = firstQuoteByLead.get(lead.id);
      if (firstQuote) {
        const hours =
          (firstQuote.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
        if (hours > 0) responseTimes.push(hours);
      }
    }

    if (responseTimes.length > 0) {
      averageResponseTimeHours =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      responseTimeLabel = `${averageResponseTimeHours.toFixed(1)}h avg (${responseTimes.length} leads with quotes)`;
    }
  }

  return {
    leadCount,
    companyCount,
    quotationCount,
    taskCount,
    pendingApprovalCount,
    webhookEventCount,
    productCount,
    staleLeadCount,
    averageResponseTimeHours,
    responseTimeLabel,
    webhookFailureCount,
    webhookTotal24h,
    pendingJobCount,
    failedJob24hCount,
    aiTotalSpendMonth,
    aiCallCountMonth,
    aiBudget: org?.aiMonthlyBudget ? Number(org.aiMonthlyBudget) : 0,
  };
}

export type FunnelStage = {
  label: string;
  count: number;
  percentage: number;
};

export type FunnelMetrics = {
  stages: FunnelStage[];
  staleValueEstimate: number;
  staleValueCurrency: string;
  responseTimeByChannel: { channel: string; avgHours: number | null }[];
};

export async function getFunnelMetrics(
  organizationId: string,
): Promise<FunnelMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const [
    inboundCount,
    messageCount,
    leadCount,
    taskCount,
    quotationCount,
    sentQuotationCount,
    staleCount,
    org,
    leadsWithQuotes,
  ] = await Promise.all([
    prisma.webhookEvent.count({
      where: { organizationId, receivedAt: { gte: sevenDaysAgo } },
    }),
    prisma.message.count({
      where: {
        conversation: { organizationId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.lead.count({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.task.count({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.quotation.count({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.quotation.count({
      where: {
        organizationId,
        status: "SENT",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.lead.count({
      where: {
        organizationId,
        updatedAt: { lt: sevenDaysAgo },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { avgDealValue: true, conversionRate: true },
    }),
    prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
      select: { id: true, source: true, createdAt: true },
      take: 100,
    }),
  ]);

  const avgDealValue = org?.avgDealValue ? Number(org.avgDealValue) : 0;
  const conversionRate = org?.conversionRate ?? 0;
  const staleValueEstimate =
    staleCount > 0 ? staleCount * avgDealValue * conversionRate : 0;

  const stages: FunnelStage[] = [
    { label: "Inbound Events", count: inboundCount, percentage: 100 },
    {
      label: "Messages Stored",
      count: messageCount,
      percentage:
        inboundCount > 0 ? Math.round((messageCount / inboundCount) * 100) : 0,
    },
    {
      label: "Leads Created",
      count: leadCount,
      percentage:
        inboundCount > 0 ? Math.round((leadCount / inboundCount) * 100) : 0,
    },
    {
      label: "Follow-ups Scheduled",
      count: taskCount,
      percentage:
        inboundCount > 0 ? Math.round((taskCount / inboundCount) * 100) : 0,
    },
    {
      label: "Quotations Drafted",
      count: quotationCount,
      percentage:
        inboundCount > 0
          ? Math.round((quotationCount / inboundCount) * 100)
          : 0,
    },
    {
      label: "Quotations Sent",
      count: sentQuotationCount,
      percentage:
        inboundCount > 0
          ? Math.round((sentQuotationCount / inboundCount) * 100)
          : 0,
    },
  ];

  const channelResponseTimes = new Map<string, number[]>();
  if (leadsWithQuotes.length > 0) {
    const quotes = await prisma.quotation.findMany({
      where: {
        organizationId,
        leadId: { in: leadsWithQuotes.map((l) => l.id) },
      },
      select: { leadId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const firstQuoteByLead = new Map<string, Date>();
    for (const q of quotes) {
      if (q.leadId && !firstQuoteByLead.has(q.leadId))
        firstQuoteByLead.set(q.leadId, q.createdAt);
    }
    for (const lead of leadsWithQuotes) {
      const fq = firstQuoteByLead.get(lead.id);
      if (fq) {
        const hours =
          (fq.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
        if (hours > 0) {
          const channel = lead.source || "unknown";
          if (!channelResponseTimes.has(channel))
            channelResponseTimes.set(channel, []);
          channelResponseTimes.get(channel)!.push(hours);
        }
      }
    }
  }

  const responseTimeByChannel = Array.from(channelResponseTimes.entries()).map(
    ([channel, times]) => ({
      channel,
      avgHours:
        times.length > 0
          ? times.reduce((a, b) => a + b, 0) / times.length
          : null,
    }),
  );

  return {
    stages,
    staleValueEstimate,
    staleValueCurrency: "USD",
    responseTimeByChannel,
  };
}

export type WeeklyReport = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  organizationId: string;
  inboundVolume: number;
  responseSpeedHours: number | null;
  responseSpeedLabel: string;
  quotationVolume: number;
  quotationSentVolume: number;
  staleLeadCount: number;
  topDemandCategories: { category: string; count: number }[];
  dataPrivacyNote: string;
};

export type SnapshotPayload = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  inboundVolume: number;
  responseSpeedHours: number | null;
  responseSpeedLabel: string;
  quotationVolume: number;
  quotationSentVolume: number;
  staleLeadCount: number;
  topDemandCategories: { category: string; count: number }[];
  dataPrivacyNote: string;
};

export type CreateWeeklySnapshotInput = {
  organizationId: string;
};

export type ApproveSnapshotInput = {
  organizationId: string;
  snapshotId: string;
};

export const createWeeklySnapshotAction = registerAction<
  CreateWeeklySnapshotInput,
  { id: string; status: string }
>({
  name: "report.snapshotCreate",
  description:
    "Create a weekly aggregate report snapshot for the organization.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(createWeeklySnapshotSchema, input);
    const client = db(context);
    const report = await generateWeeklyReportWithClient(
      client,
      parsed.organizationId,
    );
    const payload: SnapshotPayload = {
      generatedAt: report.generatedAt,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      inboundVolume: report.inboundVolume,
      responseSpeedHours: report.responseSpeedHours,
      responseSpeedLabel: report.responseSpeedLabel,
      quotationVolume: report.quotationVolume,
      quotationSentVolume: report.quotationSentVolume,
      staleLeadCount: report.staleLeadCount,
      topDemandCategories: report.topDemandCategories,
      dataPrivacyNote: report.dataPrivacyNote,
    };
    return client.reportSnapshot.create({
      data: {
        organizationId: parsed.organizationId,
        reportType: "weekly",
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        payload,
      },
      select: { id: true, status: true },
    });
  },
});

export const approveSnapshotAction = registerAction<
  ApproveSnapshotInput,
  { approved: boolean }
>({
  name: "report.snapshotApprove",
  description: "Approve a draft report snapshot for distribution.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(approveSnapshotSchema, input);
    const client = db(context);
    const snapshot = await client.reportSnapshot.findUnique({
      where: { id: parsed.snapshotId },
    });
    if (!snapshot) throw new Error("SNAPSHOT_NOT_FOUND");
    if (snapshot.organizationId !== parsed.organizationId)
      throw new Error("SNAPSHOT_ACCESS_DENIED");
    if (snapshot.status !== "DRAFT")
      throw new Error("SNAPSHOT_ALREADY_PROCESSED");

    await client.reportSnapshot.update({
      where: { id: parsed.snapshotId },
      data: { status: "APPROVED", approvedById: context.actorUserId },
    });
    return { approved: true };
  },
});

export async function createWeeklySnapshot(
  organizationId: string,
  context: ActionContext,
): Promise<{ id: string; status: string }> {
  return executeAction<
    CreateWeeklySnapshotInput,
    { id: string; status: string }
  >("report.snapshotCreate", { organizationId }, context);
}

export async function approveSnapshot(
  snapshotId: string,
  organizationId: string,
  context: ActionContext,
): Promise<{ approved: boolean }> {
  return executeAction<ApproveSnapshotInput, { approved: boolean }>(
    "report.snapshotApprove",
    { organizationId, snapshotId },
    context,
  );
}

export async function listSnapshots(organizationId: string): Promise<
  {
    id: string;
    reportType: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    createdAt: Date;
  }[]
> {
  return prisma.reportSnapshot.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      reportType: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function getSnapshot(snapshotId: string, organizationId: string) {
  const snapshot = await prisma.reportSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot) throw new Error("SNAPSHOT_NOT_FOUND");
  if (snapshot.organizationId !== organizationId)
    throw new Error("SNAPSHOT_ACCESS_DENIED");
  return snapshot;
}

export async function generateWeeklyReport(
  organizationId: string,
): Promise<WeeklyReport> {
  return generateWeeklyReportWithClient(prisma, organizationId);
}

async function generateWeeklyReportWithClient(
  client: typeof prisma,
  organizationId: string,
): Promise<WeeklyReport> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const [
    inboundVolume,
    responseSpeed,
    quotationVolume,
    quotationSentVolume,
    staleLeadCount,
    leads,
  ] = await Promise.all([
    client.webhookEvent.count({
      where: { organizationId, receivedAt: { gte: sevenDaysAgo } },
    }),
    (async () => {
      const recent = await client.lead.findMany({
        where: { organizationId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, createdAt: true },
      });
      if (recent.length === 0) return null;
      const quotes = await client.quotation.findMany({
        where: { organizationId, leadId: { in: recent.map((l) => l.id) } },
        select: { leadId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const firstQuote = new Map<string, Date>();
      for (const q of quotes) {
        if (q.leadId && !firstQuote.has(q.leadId))
          firstQuote.set(q.leadId, q.createdAt);
      }
      const times: number[] = [];
      for (const lead of recent) {
        const fq = firstQuote.get(lead.id);
        if (fq) {
          const h =
            (fq.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60);
          if (h > 0) times.push(h);
        }
      }
      return times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : null;
    })(),
    client.quotation.count({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
    }),
    client.quotation.count({
      where: {
        organizationId,
        status: "SENT",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    client.lead.count({
      where: {
        organizationId,
        updatedAt: { lt: sevenDaysAgo },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    client.lead.findMany({
      where: { organizationId, createdAt: { gte: sevenDaysAgo } },
      select: { need: true },
      take: 100,
    }),
  ]);

  const categoryCounts = new Map<string, number>();
  for (const lead of leads) {
    const need = (lead.need ?? "").toLowerCase();
    const categories = [
      "rice",
      "coffee",
      "seafood",
      "cashew",
      "pepper",
      "textile",
      "steel",
      "chemical",
      "wood",
      "plastic",
      "fruit",
      "spice",
    ];
    for (const cat of categories) {
      if (need.includes(cat)) {
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      }
    }
  }
  const topDemandCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  return {
    generatedAt: now.toISOString(),
    periodStart: sevenDaysAgo.toISOString().slice(0, 10),
    periodEnd: now.toISOString().slice(0, 10),
    organizationId,
    inboundVolume,
    responseSpeedHours: responseSpeed,
    responseSpeedLabel:
      responseSpeed !== null
        ? `${responseSpeed.toFixed(1)}h avg`
        : "unavailable",
    quotationVolume,
    quotationSentVolume,
    staleLeadCount,
    topDemandCategories,
    dataPrivacyNote:
      "This report contains aggregate metrics only. Individual lead, company, and customer details are excluded to protect private member data.",
  };
}

const PLAN_LIMITS: Record<
  string,
  {
    seats: number;
    monthlyInbound: number;
    aiBudget: number;
    integrations: number;
    snapshots: number;
  }
> = {
  FREE: {
    seats: 1,
    monthlyInbound: 100,
    aiBudget: 0,
    integrations: 0,
    snapshots: 0,
  },
  PILOT: {
    seats: 3,
    monthlyInbound: 1000,
    aiBudget: 10,
    integrations: 1,
    snapshots: 5,
  },
  TEAM: {
    seats: 10,
    monthlyInbound: 10000,
    aiBudget: 50,
    integrations: 3,
    snapshots: 20,
  },
  ASSOCIATION: {
    seats: 50,
    monthlyInbound: 100000,
    aiBudget: 200,
    integrations: 10,
    snapshots: 100,
  },
  ENTERPRISE: {
    seats: Infinity,
    monthlyInbound: Infinity,
    aiBudget: Infinity,
    integrations: Infinity,
    snapshots: Infinity,
  },
};

export type BillingDimension = {
  dimension: string;
  usage: number;
  limit: number;
  exceeded: boolean;
};

export type BillingMetrics = {
  plan: string;
  userCount: number;
  monthlyInbound: number;
  integrationsCount: number;
  snapshotMonthCount: number;
  dimensions: BillingDimension[];
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

export async function getBillingMetrics(
  organizationId: string,
): Promise<BillingMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    org,
    seatCount,
    monthlyInbound,
    integrationsCount,
    snapshotMonthCount,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    }),
    prisma.organizationMember.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.webhookEvent.count({
      where: { organizationId, receivedAt: { gte: monthStart } },
    }),
    prisma.webhookIntegration.count({ where: { organizationId } }),
    prisma.reportSnapshot.count({
      where: { organizationId, createdAt: { gte: monthStart } },
    }),
  ]);

  const plan = org?.plan ?? "FREE";
  const limits = getPlanLimits(plan);

  const dimensions: BillingDimension[] = [
    {
      dimension: "seats",
      usage: seatCount,
      limit: limits.seats,
      exceeded: seatCount > limits.seats,
    },
    {
      dimension: "monthly_inbound",
      usage: monthlyInbound,
      limit: limits.monthlyInbound,
      exceeded: monthlyInbound > limits.monthlyInbound,
    },
    {
      dimension: "integrations",
      usage: integrationsCount,
      limit: limits.integrations,
      exceeded: integrationsCount > limits.integrations,
    },
    {
      dimension: "snapshots",
      usage: snapshotMonthCount,
      limit: limits.snapshots,
      exceeded: snapshotMonthCount > limits.snapshots,
    },
  ];

  return {
    plan,
    userCount: seatCount,
    monthlyInbound,
    integrationsCount,
    snapshotMonthCount,
    dimensions,
  };
}

export type ExportBillingUsageInput = {
  organizationId: string;
};

export type ExportTenantDataInput = {
  organizationId: string;
};

export const createWeeklySnapshotSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const approveSnapshotSchema = z
  .object({
    organizationId: z.string().min(1),
    snapshotId: z.string().min(1),
  })
  .strict();

export const exportBillingUsageSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const exportTenantDataSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const exportBillingUsageAction = registerAction<
  ExportBillingUsageInput,
  unknown
>({
  name: "billing.export",
  description: "Export billing and usage data for the current organization.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(exportBillingUsageSchema, input);
    return exportBillingUsageWithClient(db(context), parsed.organizationId);
  },
});

export const exportTenantDataAction = registerAction<
  ExportTenantDataInput,
  unknown
>({
  name: "privacy.export",
  description: "Export tenant data for privacy/data portability requests.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(exportTenantDataSchema, input);
    return exportTenantDataWithClient(db(context), parsed.organizationId);
  },
});

export async function exportBillingUsage(
  organizationId: string,
  context: ActionContext,
) {
  return executeAction("billing.export", { organizationId }, context);
}

export async function exportTenantData(
  organizationId: string,
  context: ActionContext,
) {
  return executeAction("privacy.export", { organizationId }, context);
}

async function exportBillingUsageWithClient(
  client: typeof prisma,
  organizationId: string,
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const org = await client.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, aiMonthlyBudget: true },
  });

  const [users, webhookEvents, aiUsage, snapshots, quotations, integrations] =
    await Promise.all([
      client.user.findMany({
        where: { organizationId },
        select: { email: true, role: true, createdAt: true },
      }),
      client.webhookEvent.findMany({
        where: { organizationId, receivedAt: { gte: monthStart } },
        select: { channel: true, receivedAt: true, status: true },
      }),
      client.aiUsageEvent.findMany({
        where: { organizationId, createdAt: { gte: monthStart } },
        select: {
          feature: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true,
          createdAt: true,
        },
      }),
      client.reportSnapshot.findMany({
        where: { organizationId, createdAt: { gte: monthStart } },
        select: { reportType: true, status: true, createdAt: true },
      }),
      client.quotation.findMany({
        where: { organizationId, createdAt: { gte: monthStart } },
        select: { status: true, totalAmount: true, createdAt: true },
      }),
      client.webhookIntegration.findMany({
        where: { organizationId },
        select: { channel: true, status: true, createdAt: true },
      }),
    ]);

  const aiCostTotal = aiUsage.reduce(
    (sum, r) => sum + Number(r.estimatedCost),
    0,
  );

  const exported = {
    exportedAt: now.toISOString(),
    organizationId,
    plan: org?.plan ?? "FREE",
    aiMonthlyBudget: org?.aiMonthlyBudget ? Number(org.aiMonthlyBudget) : 0,
    summary: {
      userCount: users.length,
      inboundCount: webhookEvents.length,
      aiCallCount: aiUsage.length,
      aiCostTotal,
      snapshotCount: snapshots.length,
      quotationCount: quotations.length,
      integrationCount: integrations.length,
    },
    users,
    webhookEvents,
    aiUsage,
    snapshots,
    quotations,
    integrations,
  };
  return exported;
}

async function exportTenantDataWithClient(
  client: typeof prisma,
  organizationId: string,
) {
  const [
    org,
    users,
    companies,
    contacts,
    leads,
    products,
    conversations,
    messages,
    quotations,
    tasks,
    auditLogs,
    approvalRequests,
    webhookEvents,
    integrations,
    snapshots,
    evidenceItems,
  ] = await Promise.all([
    client.organization.findUnique({ where: { id: organizationId } }),
    client.user.findMany({ where: { organizationId } }),
    client.company.findMany({ where: { organizationId } }),
    client.contact.findMany({ where: { organizationId } }),
    client.lead.findMany({ where: { organizationId } }),
    client.product.findMany({ where: { organizationId } }),
    client.conversation.findMany({ where: { organizationId } }),
    client.message.findMany({ where: { conversation: { organizationId } } }),
    client.quotation.findMany({ where: { organizationId } }),
    client.task.findMany({ where: { organizationId } }),
    client.auditLog.findMany({ where: { organizationId } }),
    client.approvalRequest.findMany({ where: { organizationId } }),
    client.webhookEvent.findMany({ where: { organizationId } }),
    client.webhookIntegration.findMany({ where: { organizationId } }),
    client.reportSnapshot.findMany({ where: { organizationId } }),
    client.evidenceItem.findMany({ where: { organizationId } }),
  ]);

  const exported = {
    exportedAt: new Date().toISOString(),
    organizationId,
    organizationName: org?.name ?? null,
    recordCounts: {
      users: users.length,
      companies: companies.length,
      contacts: contacts.length,
      leads: leads.length,
      products: products.length,
      conversations: conversations.length,
      messages: messages.length,
      quotations: quotations.length,
      tasks: tasks.length,
      auditLogs: auditLogs.length,
      approvalRequests: approvalRequests.length,
      webhookEvents: webhookEvents.length,
      integrations: integrations.length,
      snapshots: snapshots.length,
      evidenceItems: evidenceItems.length,
    },
    users,
    companies,
    contacts,
    leads,
    products,
    conversations,
    messages,
    quotations,
    tasks,
    auditLogs: auditLogs.map((l) => ({
      ...l,
      input: undefined,
      result: undefined,
    })),
    approvalRequests,
    webhookEvents: webhookEvents.map((e) => ({
      ...e,
      payload: undefined,
      result: undefined,
    })),
    integrations,
    snapshots,
    evidenceItems: evidenceItems.map((e) => ({
      ...e,
      content: undefined,
      fileUrl: undefined,
      externalUrl: undefined,
      metadata: undefined,
    })),
  };
  return exported;
}

export async function anonymizeTenantPii(
  organizationId: string,
  context: ActionContext,
) {
  return executeAction("privacy.anonymizePii", { organizationId }, context);
}

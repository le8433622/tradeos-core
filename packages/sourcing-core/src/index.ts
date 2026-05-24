import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  DEFAULT_LOW_RISK_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
} from "@tradeos/policy-core";
import type { ActionContext } from "@tradeos/policy-core";
import { z } from "zod";

export const createSourcingRunSchema = z
  .object({
    organizationId: z.string().min(1),
    leadId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    requirement: z.string().min(1).max(16384),
    targetCountry: z.string().max(128).optional(),
    sourceCountry: z.string().max(128).optional(),
    productCategory: z.string().max(128).optional(),
    quantity: z.string().max(64).optional(),
    budget: z.string().max(64).optional(),
    currency: z.string().max(8).optional(),
    riskLevel: z.string().max(32).optional(),
  })
  .strict();

export const createSourcingRunAction = registerAction<
  z.infer<typeof createSourcingRunSchema>,
  { id: string; status: string }
>({
  name: "sourcing.createRun",
  description: "Create a new sourcing run for supplier discovery and quotation.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createSourcingRunSchema.parse(input);
    const run = await prisma.sourcingRun.create({
      data: {
        organizationId: parsed.organizationId,
        leadId: parsed.leadId,
        title: parsed.title,
        requirement: parsed.requirement,
        targetCountry: parsed.targetCountry,
        sourceCountry: parsed.sourceCountry,
        productCategory: parsed.productCategory,
        quantity: parsed.quantity,
        budget: parsed.budget,
        currency: parsed.currency,
        riskLevel: parsed.riskLevel ?? "MEDIUM",
        createdById: context.actorUserId,
      },
      select: { id: true, status: true },
    });
    return { id: run.id, status: run.status };
  },
});

export const addSupplierCandidateSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    name: z.string().min(1).max(256),
    source: z.string().max(128).optional(),
    website: z.string().max(512).optional(),
    platform: z.string().max(128).optional(),
    country: z.string().max(128).optional(),
    contactInfo: z.any().optional(),
    reliabilityScore: z.number().min(0).max(100).optional(),
    riskFlags: z.any().optional(),
  })
  .strict();

export const addSupplierCandidateAction = registerAction<
  z.infer<typeof addSupplierCandidateSchema>,
  { id: string }
>({
  name: "sourcing.addSupplierCandidate",
  description: "Add a supplier candidate to a sourcing run.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = addSupplierCandidateSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const candidate = await prisma.supplierCandidate.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        name: parsed.name,
        source: parsed.source,
        website: parsed.website,
        platform: parsed.platform,
        country: parsed.country,
        contactInfo: parsed.contactInfo,
        reliabilityScore: parsed.reliabilityScore,
        riskFlags: parsed.riskFlags,
      },
      select: { id: true },
    });
    return { id: candidate.id };
  },
});

export const addSupplierQuoteSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    supplierCandidateId: z.string().min(1).optional(),
    productDescription: z.string().min(1).max(2048),
    quantity: z.number().min(0).optional(),
    unit: z.string().max(32).optional(),
    unitPrice: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    currency: z.string().max(8).optional(),
    moq: z.string().max(64).optional(),
    leadTime: z.string().max(64).optional(),
    shippingTerm: z.string().max(128).optional(),
    paymentTerm: z.string().max(128).optional(),
    warranty: z.string().max(256).optional(),
    riskScore: z.number().min(0).max(100).optional(),
    rawData: z.any().optional(),
  })
  .strict();

export const addSupplierQuoteAction = registerAction<
  z.infer<typeof addSupplierQuoteSchema>,
  { id: string }
>({
  name: "sourcing.addSupplierQuote",
  description: "Add a supplier quote to a sourcing run.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = addSupplierQuoteSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const quote = await prisma.supplierQuote.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        supplierCandidateId: parsed.supplierCandidateId,
        productDescription: parsed.productDescription,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        totalAmount: parsed.totalAmount,
        currency: parsed.currency,
        moq: parsed.moq,
        leadTime: parsed.leadTime,
        shippingTerm: parsed.shippingTerm,
        paymentTerm: parsed.paymentTerm,
        warranty: parsed.warranty,
        riskScore: parsed.riskScore,
        rawData: parsed.rawData,
      },
      select: { id: true },
    });
    return { id: quote.id };
  },
});

export const compareQuotesSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export const compareQuotesAction = registerAction<
  z.infer<typeof compareQuotesSchema>,
  {
    quoteCount: number;
    bestPriceQuoteId: string | null;
    bestRiskQuoteId: string | null;
  }
>({
  name: "sourcing.compareQuotes",
  description:
    "Compare all collected supplier quotes and rank them by price and risk.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = compareQuotesSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    const quotes = await prisma.supplierQuote.findMany({
      where: { sourcingRunId: parsed.sourcingRunId },
      orderBy: { totalAmount: "asc" },
    });

    let bestPriceQuoteId: string | null = null;
    let bestRiskQuoteId: string | null = null;

    if (quotes.length > 0) {
      bestPriceQuoteId = quotes[0].id;

      const sortedByRisk = [...quotes].sort(
        (a, b) => (a.riskScore ?? 50) - (b.riskScore ?? 50),
      );
      bestRiskQuoteId = sortedByRisk[0].id;

      await prisma.$transaction(
        quotes.map((q, i) =>
          prisma.supplierQuote.update({
            where: { id: q.id },
            data: { comparisonRank: i + 1 },
          }),
        ),
      );
    }

    return {
      quoteCount: quotes.length,
      bestPriceQuoteId,
      bestRiskQuoteId,
    };
  },
});

export const markRunReadyForReviewSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export const markRunReadyForReviewAction = registerAction<
  z.infer<typeof markRunReadyForReviewSchema>,
  { status: string }
>({
  name: "sourcing.markRunReadyForReview",
  description:
    "Mark a sourcing run as ready for human review after quotes are compared.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = markRunReadyForReviewSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const updated = await prisma.sourcingRun.update({
      where: { id: parsed.sourcingRunId },
      data: { status: "READY_FOR_REVIEW" },
      select: { status: true },
    });
    return { status: updated.status };
  },
});

export const deliverBuyerReportSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    summary: z.string().min(1).max(16384),
    recommendedSupplierName: z.string().max(256).optional(),
    expectedSavings: z.number().min(0).optional(),
    currency: z.string().max(8).optional(),
    risks: z.array(z.string()).optional(),
    missingInformation: z.array(z.string()).optional(),
    nextActions: z.array(z.string()).optional(),
  })
  .strict();

export const deliverBuyerReportAction = registerAction<
  z.infer<typeof deliverBuyerReportSchema>,
  { status: string }
>({
  name: "sourcing.deliverBuyerReport",
  description:
    "Deliver the final buyer decision report. AI cannot execute without human approval.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = deliverBuyerReportSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const updated = await prisma.sourcingRun.update({
      where: { id: parsed.sourcingRunId },
      data: { status: "REPORT_DELIVERED" },
      select: { status: true },
    });
    return { status: updated.status };
  },
});

export const createCheckpointSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    description: z.string().max(4096).optional(),
    checkpointType: z.string().min(1).max(64),
    price: z.number().min(0).optional(),
    currency: z.string().max(8).optional(),
    payerOrgId: z.string().optional(),
  })
  .strict();

export const createCheckpointAction = registerAction<
  z.infer<typeof createCheckpointSchema>,
  { id: string; status: string }
>({
  name: "checkpoint.create",
  description: "Create a work checkpoint for a sourcing run.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createCheckpointSchema.parse(input);
    const cp = await prisma.workCheckpoint.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        title: parsed.title,
        description: parsed.description,
        checkpointType: parsed.checkpointType as any,
        price: parsed.price,
        currency: parsed.currency,
        payerOrgId: parsed.payerOrgId,
      },
      select: { id: true, status: true },
    });
    return { id: cp.id, status: cp.status };
  },
});

export const checkpointMarkDeliveredSchema = z
  .object({
    organizationId: z.string().min(1),
    checkpointId: z.string().min(1),
  })
  .strict();

export const checkpointMarkDeliveredAction = registerAction<
  z.infer<typeof checkpointMarkDeliveredSchema>,
  { status: string }
>({
  name: "checkpoint.markDelivered",
  description: "Mark a checkpoint as delivered after work is completed.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = checkpointMarkDeliveredSchema.parse(input);
    const cp = await prisma.workCheckpoint.findUnique({
      where: { id: parsed.checkpointId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(cp, parsed.organizationId, "CHECKPOINT");
    const updated = await prisma.workCheckpoint.update({
      where: { id: parsed.checkpointId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
      select: { status: true },
    });
    return { status: updated.status };
  },
});

export const checkpointApproveForBillingSchema = z
  .object({
    organizationId: z.string().min(1),
    checkpointId: z.string().min(1),
  })
  .strict();

export const checkpointApproveForBillingAction = registerAction<
  z.infer<typeof checkpointApproveForBillingSchema>,
  { status: string }
>({
  name: "checkpoint.approveForBilling",
  description:
    "Approve a delivered checkpoint for billing. AI cannot execute this action without human approval.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = checkpointApproveForBillingSchema.parse(input);
    const cp = await prisma.workCheckpoint.findUnique({
      where: { id: parsed.checkpointId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(cp, parsed.organizationId, "CHECKPOINT");
    if (cp?.status !== "DELIVERED") throw new Error("CHECKPOINT_NOT_DELIVERED");
    const updated = await prisma.workCheckpoint.update({
      where: { id: parsed.checkpointId },
      data: {
        status: "APPROVED",
        approvedById: context.actorUserId,
        approvedAt: new Date(),
      },
      select: { status: true },
    });
    return { status: updated.status };
  },
});

export const handoverCreateSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1).optional(),
    reason: z.string().min(1).max(64),
    riskLevel: z.string().min(1).max(32),
    context: z.any(),
    recommendedNextAction: z.string().max(4096).optional(),
  })
  .strict();

export const handoverCreateAction = registerAction<
  z.infer<typeof handoverCreateSchema>,
  { id: string; status: string }
>({
  name: "handover.create",
  description:
    "Create a human handover from AI to a human operator when escalation is needed.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = handoverCreateSchema.parse(input);
    const h = await prisma.humanHandover.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        reason: parsed.reason as any,
        riskLevel: parsed.riskLevel,
        context: parsed.context,
        recommendedNextAction: parsed.recommendedNextAction,
      },
      select: { id: true, status: true },
    });
    return { id: h.id, status: h.status };
  },
});

export const handoverResolveSchema = z
  .object({
    organizationId: z.string().min(1),
    handoverId: z.string().min(1),
    resolution: z.string().max(4096).optional(),
  })
  .strict();

export const handoverResolveAction = registerAction<
  z.infer<typeof handoverResolveSchema>,
  { status: string }
>({
  name: "handover.resolve",
  description: "Resolve a human handover after the issue is addressed.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = handoverResolveSchema.parse(input);
    const h = await prisma.humanHandover.findUnique({
      where: { id: parsed.handoverId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(h, parsed.organizationId, "HANDOVER");
    const updated = await prisma.humanHandover.update({
      where: { id: parsed.handoverId },
      data: {
        status: "RESOLVED",
        resolvedById: context.actorUserId,
        resolvedAt: new Date(),
      },
      select: { status: true },
    });
    return { status: updated.status };
  },
});
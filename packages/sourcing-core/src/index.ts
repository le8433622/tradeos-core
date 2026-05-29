import { Prisma, prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  DEFAULT_LOW_RISK_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
} from "@tradeos/policy-core";
import {
  assertKillSwitchEnabled,
  type ActionContext,
} from "@tradeos/policy-core";
import { checkEntitlement } from "@tradeos/plan-core";
import { z } from "zod";
import {
  computeSwitchDecision,
  deriveEvidenceQuality,
  isWeakDecisionAuthority,
  parseTradePainMetadata,
} from "./switch-decision";

export {
  isWeakDecisionAuthority,
  normalizeDecisionAuthorityLevel,
  parseTradePainMetadata,
  deriveEvidenceQuality,
  type DecisionAuthorityLevel,
  type EvidenceQualityLevel,
  type TradePainMetadata,
} from "./switch-decision";

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

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
    metadata: z
      .object({
        painCategories: z.array(z.string().max(128)).optional(),
        painDetail: z.string().max(4096).optional(),
        evidenceSummary: z.string().max(4096).optional(),
        decisionAuthority: z.string().max(64).optional(),
        decisionAuthorityLevel: z.string().max(64).optional(),
        expectedOutcome: z.string().max(4096).optional(),
        dependencyFlags: z.array(z.string().max(128)).optional(),
        reportedBy: z.string().max(256).optional(),
        buyerContact: z.string().max(256).optional(),
        decisionMakerKnown: z.boolean().nullable().optional(),
        decisionMakerNameOrRole: z.string().max(256).optional(),
        payerKnown: z.boolean().nullable().optional(),
        payerNameOrRole: z.string().max(256).optional(),
        consequenceOwner: z.string().max(256).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const createSourcingRunAction = registerAction<
  z.infer<typeof createSourcingRunSchema>,
  { id: string; status: string }
>({
  name: "sourcing.createRun",
  description:
    "Create a new sourcing run for supplier discovery and quotation.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createSourcingRunSchema.parse(input);
    const entitlement = await checkEntitlement(
      parsed.organizationId,
      "sourcing_runs",
    );
    if (!entitlement.allowed) {
      throw new Error("ENTITLEMENT_EXCEEDED");
    }
    if (parsed.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: parsed.leadId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(lead, parsed.organizationId, "LEAD");
    }
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
        metadata: parsed.metadata,
        createdById: context.actorUserId,
      },
      select: { id: true, status: true },
    });
    return { id: run.id, status: run.status };
  },
});

export const createPurchaseBaselineSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    supplierName: z.string().min(1).max(256),
    sourceType: z.enum(["INVOICE", "PRICE_LIST", "MANUAL"]).optional(),
    sourceEvidenceId: z.string().optional(),
    productDescription: z.string().min(1).max(4096),
    quantity: z.string().optional(),
    unit: z.string().max(64).optional(),
    unitPrice: z.string().optional(),
    originUnitPrice: z.string().optional(),
    landedCost: z.string().optional(),
    marketBenchmarkPrice: z.string().optional(),
    currency: z.string().max(8).optional(),
    frequency: z.string().max(64).optional(),
    paymentTerms: z.string().max(256).optional(),
    deliveryTerms: z.string().max(256).optional(),
    leadTime: z.string().max(128).optional(),
    minOrderQty: z.string().max(128).optional(),
  })
  .strict();

export const createPurchaseBaselineAction = registerAction<
  z.infer<typeof createPurchaseBaselineSchema>,
  { id: string }
>({
  name: "sourcing.createPurchaseBaseline",
  description: "Create a purchase baseline snapshot linked to a sourcing run.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createPurchaseBaselineSchema.parse(input);
    const entitlement = await checkEntitlement(
      parsed.organizationId,
      "sourcing_runs",
    );
    if (!entitlement.allowed) {
      throw new Error("ENTITLEMENT_EXCEEDED");
    }
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    const baseline = await prisma.purchaseBaseline.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        supplierName: parsed.supplierName,
        sourceType: parsed.sourceType ?? "MANUAL",
        sourceEvidenceId: parsed.sourceEvidenceId,
        productDescription: parsed.productDescription,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        originUnitPrice: parsed.originUnitPrice,
        landedCost: parsed.landedCost,
        marketBenchmarkPrice: parsed.marketBenchmarkPrice,
        currency: parsed.currency,
        frequency: parsed.frequency,
        paymentTerms: parsed.paymentTerms,
        deliveryTerms: parsed.deliveryTerms,
        leadTime: parsed.leadTime,
        minOrderQty: parsed.minOrderQty,
      },
      select: { id: true },
    });
    return { id: baseline.id };
  },
});

export const addSupplierAlternativeSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    supplierName: z.string().min(1).max(256),
    supplierCandidateId: z.string().optional(),
    productDescription: z.string().min(1).max(4096),
    quantity: z.string().optional(),
    unit: z.string().max(64).optional(),
    unitPrice: z.string().optional(),
    totalCost: z.string().optional(),
    currency: z.string().max(8).optional(),
    moq: z.string().max(128).optional(),
    leadTime: z.string().max(128).optional(),
    paymentTerm: z.string().max(256).optional(),
    warranty: z.string().max(512).optional(),
    shippingNotes: z.string().max(1024).optional(),
    riskFlags: z.any().optional(),
    evidenceId: z.string().optional(),
  })
  .strict();

export const addSupplierAlternativeAction = registerAction<
  z.infer<typeof addSupplierAlternativeSchema>,
  { id: string }
>({
  name: "sourcing.addSupplierAlternative",
  description:
    "Add a supplier alternative with normalized quote fields linked to a sourcing run.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = addSupplierAlternativeSchema.parse(input);
    const entitlement = await checkEntitlement(
      parsed.organizationId,
      "sourcing_runs",
    );
    if (!entitlement.allowed) {
      throw new Error("ENTITLEMENT_EXCEEDED");
    }
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    if (parsed.supplierCandidateId) {
      const candidate = await prisma.supplierCandidate.findUnique({
        where: { id: parsed.supplierCandidateId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(
        candidate,
        parsed.organizationId,
        "SUPPLIER_CANDIDATE",
      );
    }
    const alt = await prisma.supplierAlternative.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        supplierName: parsed.supplierName,
        supplierCandidateId: parsed.supplierCandidateId,
        productDescription: parsed.productDescription,
        quantity: parsed.quantity,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        totalCost: parsed.totalCost,
        currency: parsed.currency,
        moq: parsed.moq,
        leadTime: parsed.leadTime,
        paymentTerm: parsed.paymentTerm,
        warranty: parsed.warranty,
        shippingNotes: parsed.shippingNotes,
        riskFlags: parsed.riskFlags,
        evidenceId: parsed.evidenceId,
      },
      select: { id: true },
    });
    return { id: alt.id };
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
    if (parsed.supplierCandidateId) {
      const candidate = await prisma.supplierCandidate.findUnique({
        where: { id: parsed.supplierCandidateId },
        select: { organizationId: true, sourcingRunId: true },
      });
      validateRecordBelongsToOrg(
        candidate,
        parsed.organizationId,
        "SUPPLIER_CANDIDATE",
      );
      if (candidate!.sourcingRunId !== parsed.sourcingRunId) {
        throw new Error("SUPPLIER_CANDIDATE_RUN_MISMATCH");
      }
    }
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
  { status: string; evidenceId: string }
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
    const evidence = await prisma.evidenceItem.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        relatedType: "SOURCING_RUN",
        relatedId: parsed.sourcingRunId,
        evidenceType: "BUYER_DECISION",
        title: parsed.summary.slice(0, 256),
        description:
          [...(parsed.risks ?? []), ...(parsed.missingInformation ?? [])].join(
            "; ",
          ) || null,
        content: JSON.stringify({
          recommendedSupplierName: parsed.recommendedSupplierName,
          expectedSavings: parsed.expectedSavings,
          currency: parsed.currency,
          risks: parsed.risks,
          missingInformation: parsed.missingInformation,
          nextActions: parsed.nextActions,
        }),
        capturedBy: context.actorUserId,
        capturedAt: new Date(),
      },
      select: { id: true },
    });
    return { status: updated.status, evidenceId: evidence.id };
  },
});

export const assignBuyerReportSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    assignedToEmail: z.string().email().max(256),
    notes: z.string().max(1024).optional(),
  })
  .strict();

export type AssignBuyerReportResult = {
  deliveryId: string;
};

export const assignBuyerReportAction = registerAction<
  z.infer<typeof assignBuyerReportSchema>,
  AssignBuyerReportResult
>({
  name: "sourcing.assignBuyerReport",
  description:
    "Assign a switch decision report to a buyer reviewer by email. Creates or updates a BuyerReportDelivery record.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = assignBuyerReportSchema.parse(input);
    const assignedToEmail = parsed.assignedToEmail.trim().toLowerCase();
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    const delivery = await prisma.buyerReportDelivery.upsert({
      where: {
        organizationId_sourcingRunId_assignedToEmail: {
          organizationId: parsed.organizationId,
          sourcingRunId: parsed.sourcingRunId,
          assignedToEmail,
        },
      },
      create: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        assignedToEmail,
        assignedById: context.actorUserId,
        notes: parsed.notes,
      },
      update: {
        assignedById: context.actorUserId,
        notes: parsed.notes ?? undefined,
        status: "PENDING",
        deliveredAt: new Date(),
        viewedAt: null,
      },
      select: { id: true },
    });

    return { deliveryId: delivery.id };
  },
});

export const generateSwitchDecisionSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export type GenerateSwitchDecisionResult = {
  id: string;
  recommendation: string;
  confidence: string;
  savingsScore: number;
  evidenceScore: number;
  paymentRiskScore: number;
  leadTimeRiskScore: number;
  dependencyRiskScore: number;
  overallScore: number;
  monthlySavings: number | null;
  annualSavings: number | null;
  savingsPercent: number | null;
  currency: string | null;
  evidenceCount: number;
  missingProof: string[];
  riskFlags: string[];
  summary: string;
  nextActions: string[];
};

export const generateSwitchDecisionAction = registerAction<
  z.infer<typeof generateSwitchDecisionSchema>,
  GenerateSwitchDecisionResult
>({
  name: "sourcing.generateSwitchDecision",
  description:
    "Generate a deterministic switch decision report from baseline, alternatives, and evidence. Recommends SWITCH, NEGOTIATE, or WAIT.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = generateSwitchDecisionSchema.parse(input);
    const database = db(context);
    const run = await database.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: {
        organizationId: true,
        currency: true,
        requirement: true,
        metadata: true,
      },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const tradePainMetadata = parseTradePainMetadata(
      run?.requirement,
      run?.metadata,
    );

    const [baselines, alternatives, evidenceItems] = await Promise.all([
      database.purchaseBaseline.findMany({
        where: { sourcingRunId: parsed.sourcingRunId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      database.supplierAlternative.findMany({
        where: { sourcingRunId: parsed.sourcingRunId },
        orderBy: { createdAt: "desc" },
        include: {
          supplierCandidate: {
            select: {
              platform: true,
              source: true,
              reliabilityScore: true,
            },
          },
        },
      }),
      database.evidenceItem.findMany({
        where: { sourcingRunId: parsed.sourcingRunId },
        select: {
          evidenceType: true,
          title: true,
          description: true,
          content: true,
          metadata: true,
        },
      }),
    ]);
    const evidenceQuality = deriveEvidenceQuality(evidenceItems);

    const baseline = baselines[0] ?? null;
    const decision = computeSwitchDecision({
      baseline: baseline
        ? {
            supplierName: baseline.supplierName,
            unitPrice: baseline.unitPrice?.toString(),
            originUnitPrice: baseline.originUnitPrice?.toString(),
            landedCost: baseline.landedCost?.toString(),
            marketBenchmarkPrice:
              baseline.marketBenchmarkPrice?.toString() ??
              baseline.marketPrice?.toString(),
            quantity: baseline.quantity?.toString(),
            currency: baseline.currency,
            frequency: baseline.frequency,
            paymentTerms: baseline.paymentTerms,
            deliveryTerms: baseline.deliveryTerms,
            leadTime: baseline.leadTime,
            riskFlags: baseline.riskFlags,
          }
        : null,
      alternatives: alternatives.map((a) => ({
        supplierName: a.supplierName,
        unitPrice: a.unitPrice?.toString(),
        totalCost: a.totalCost?.toString(),
        currency: a.currency,
        moq: a.moq,
        leadTime: a.leadTime,
        paymentTerm: a.paymentTerm,
        platform: a.supplierCandidate?.platform,
        source: a.supplierCandidate?.source,
        reliabilityScore: a.supplierCandidate?.reliabilityScore,
        estimatedSavings: a.estimatedSavings?.toString(),
        savingsConfidence: a.savingsConfidence,
        switchingCost: a.switchingCost,
        switchingRisk: a.switchingRisk,
        totalCostComparison: a.totalCostComparison,
        riskFlags: a.riskFlags,
        evidenceId: a.evidenceId,
      })),
      evidenceCount: evidenceItems.length,
      evidenceQualityScore: evidenceQuality.score,
      evidenceQualityLevel: evidenceQuality.level,
      evidenceQualityReasons: evidenceQuality.reasons,
      defaultCurrency: run?.currency ?? null,
      decisionAuthorityLevel: tradePainMetadata.decisionAuthorityLevel,
      payerKnown: tradePainMetadata.payerKnown,
      consequenceOwnerKnown: Boolean(tradePainMetadata.consequenceOwner),
    });

    const report = await database.switchDecisionReport.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        recommendation: decision.recommendation,
        confidence: decision.confidence,
        savingsScore: decision.savingsScore,
        evidenceScore: decision.evidenceScore,
        paymentRiskScore: decision.paymentRiskScore,
        leadTimeRiskScore: decision.leadTimeRiskScore,
        dependencyRiskScore: decision.dependencyRiskScore,
        overallScore: decision.overallScore,
        monthlySavings: decision.monthlySavings,
        annualSavings: decision.annualSavings,
        savingsPercent: decision.savingsPercent,
        currency: decision.currency,
        topAlternativeId:
          decision.topAlternativeIndex != null
            ? alternatives[decision.topAlternativeIndex]?.id
            : null,
        baselineId: baseline?.id ?? null,
        evidenceSummary: {
          count: decision.evidenceCount,
          qualityLevel: evidenceQuality.level,
          qualityScore: evidenceQuality.score,
          reasons: evidenceQuality.reasons,
        },
        missingProof: JSON.parse(JSON.stringify(decision.missingProof)),
        riskFlags: JSON.parse(JSON.stringify(decision.riskFlags)),
        summary: decision.summary,
        nextActions: JSON.parse(JSON.stringify(decision.nextActions)),
      },
      select: {
        id: true,
        recommendation: true,
        confidence: true,
        savingsScore: true,
        evidenceScore: true,
        paymentRiskScore: true,
        leadTimeRiskScore: true,
        dependencyRiskScore: true,
        overallScore: true,
        monthlySavings: true,
        annualSavings: true,
        savingsPercent: true,
        currency: true,
        summary: true,
        nextActions: true,
      },
    });

    return {
      id: report.id,
      recommendation: report.recommendation,
      confidence: report.confidence,
      savingsScore: report.savingsScore ?? 0,
      evidenceScore: report.evidenceScore ?? 0,
      paymentRiskScore: report.paymentRiskScore ?? 0,
      leadTimeRiskScore: report.leadTimeRiskScore ?? 0,
      dependencyRiskScore: report.dependencyRiskScore ?? 0,
      overallScore: report.overallScore ?? 0,
      monthlySavings: report.monthlySavings
        ? Number(report.monthlySavings)
        : null,
      annualSavings: report.annualSavings ? Number(report.annualSavings) : null,
      savingsPercent: report.savingsPercent
        ? Math.round(Number(report.savingsPercent) * 100) / 100
        : null,
      currency: report.currency,
      evidenceCount: evidenceItems.length,
      missingProof: decision.missingProof,
      riskFlags: decision.riskFlags,
      summary: report.summary ?? "",
      nextActions: decision.nextActions,
    };
  },
});

export const submitBuyerDecisionSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    decision: z.enum(["APPROVE", "REQUEST_MORE_PROOF", "REJECT"]),
    notes: z.string().max(4096).optional(),
  })
  .strict();

export type SubmitBuyerDecisionResult = {
  reportId: string;
  decision: string;
  evidenceId: string;
};

export const submitBuyerDecisionAction = registerAction<
  z.infer<typeof submitBuyerDecisionSchema>,
  SubmitBuyerDecisionResult
>({
  name: "sourcing.submitBuyerDecision",
  description:
    "Record a buyer decision (APPROVE / REQUEST_MORE_PROOF / REJECT) on a switch decision report. Creates BUYER_DECISION evidence.",
  riskLevel: "MEDIUM",
  allowedRoles: [...DEFAULT_ADMIN_ROLES, "BUYER_REVIEWER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = submitBuyerDecisionSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true, title: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    if (context.role === "BUYER_REVIEWER") {
      const user = await prisma.user.findUnique({
        where: { id: context.actorUserId },
        select: { email: true },
      });
      if (!user?.email) throw new Error("USER_NOT_FOUND");
      const reviewerEmail = user.email.trim().toLowerCase();
      const delivery = await prisma.buyerReportDelivery.findFirst({
        where: {
          sourcingRunId: parsed.sourcingRunId,
          organizationId: parsed.organizationId,
          assignedToEmail: reviewerEmail,
        },
        select: { id: true },
      });
      if (!delivery) throw new Error("REPORT_NOT_ASSIGNED_TO_YOU");
    }

    const report = await prisma.switchDecisionReport.findFirst({
      where: {
        sourcingRunId: parsed.sourcingRunId,
        organizationId: parsed.organizationId,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, recommendation: true },
    });
    if (!report) {
      throw new Error("NO_SWITCH_DECISION_REPORT");
    }

    const isApprove = parsed.decision === "APPROVE";

    const [updated, evidence] = await prisma.$transaction([
      prisma.switchDecisionReport.update({
        where: { id: report.id },
        data: {
          buyerDecision: parsed.decision,
          buyerDecidedAt: new Date(),
          buyerDecidedById: context.actorUserId,
        },
        select: { id: true },
      }),
      prisma.evidenceItem.create({
        data: {
          organizationId: parsed.organizationId,
          sourcingRunId: parsed.sourcingRunId,
          relatedType: "SWITCH_DECISION_REPORT",
          relatedId: report.id,
          evidenceType: "BUYER_DECISION",
          title: `Buyer decision: ${parsed.decision}`,
          description:
            `Buyer ${parsed.decision === "APPROVE" ? `accepted the ${report.recommendation} recommendation in` : parsed.decision === "REQUEST_MORE_PROOF" ? "requested more proof for" : "rejected"} the switch decision report.` +
            (parsed.notes ? ` Notes: ${parsed.notes}` : ""),
          content: JSON.stringify({
            decision: parsed.decision,
            reportId: report.id,
            recommendation: report.recommendation,
            acceptedRecommendation:
              parsed.decision === "APPROVE" ? report.recommendation : null,
            notes: parsed.notes,
          }),
          capturedBy: context.actorUserId,
          capturedAt: new Date(),
        },
        select: { id: true },
      }),
      ...(isApprove
        ? [
            prisma.task.create({
              data: {
                organizationId: parsed.organizationId,
                assigneeId: context.actorUserId,
                title: `Record outcome for "${run!.title}"`,
                description: `Sourcing run "${run!.title}" was APPROVED. Record the final outcome (switch result, satisfaction, learning).`,
                dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              },
              select: { id: true },
            }),
          ]
        : []),
    ]);

    return {
      reportId: updated.id,
      decision: parsed.decision,
      evidenceId: evidence.id,
    };
  },
});

export const createSwitchCheckpointsSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export type CreateSwitchCheckpointsResult = {
  checkpointIds: string[];
};

const SWITCH_CHECKPOINTS = [
  { title: "Baseline Scan", type: "PAID_SOURCING_REQUEST" },
  { title: "Alternative Supplier Shortlist", type: "SUPPLIER_SHORTLIST" },
  { title: "Quote Proof / Quote Comparison", type: "QUOTE_COMPARISON" },
  { title: "Switch Decision Report", type: "BUYER_DECISION_REPORT" },
  { title: "Negotiation Pack", type: "NEGOTIATION_RUN" },
  { title: "Outcome Follow-up", type: "OUTCOME_FOLLOWUP" },
] as const;

export const createSwitchCheckpointsAction = registerAction<
  z.infer<typeof createSwitchCheckpointsSchema>,
  CreateSwitchCheckpointsResult
>({
  name: "sourcing.createSwitchCheckpoints",
  description:
    "Create the standard Supplier Switch checkpoint chain (baseline → shortlist → quotes → report → negotiation → outcome).",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createSwitchCheckpointsSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    const checkpoints = await prisma.$transaction(
      SWITCH_CHECKPOINTS.map((cp) =>
        prisma.workCheckpoint.create({
          data: {
            organizationId: parsed.organizationId,
            sourcingRunId: parsed.sourcingRunId,
            title: cp.title,
            checkpointType: cp.type as any,
            status: "PENDING",
          },
          select: { id: true },
        }),
      ),
    );

    return { checkpointIds: checkpoints.map((c) => c.id) };
  },
});

export const OUTCOME_ACTIONS = [
  "NEGOTIATE",
  "SWITCH",
  "KEEP",
  "WAIT",
  "REQUEST_MORE_PROOF",
  "REJECT",
  "NO_DECISION",
  "BUYER_DISAPPEARED",
  "USED_FOR_NEGOTIATION",
  "FAILED_NO_AUTHORITY",
  "FAILED_INSUFFICIENT_TRUST",
  "FAILED_MISSING_PROOF",
  "FAILED_LOW_URGENCY",
] as const;

const FAILED_OUTCOME_ACTIONS = new Set<string>([
  "NO_DECISION",
  "BUYER_DISAPPEARED",
  "FAILED_NO_AUTHORITY",
  "FAILED_INSUFFICIENT_TRUST",
  "FAILED_MISSING_PROOF",
  "FAILED_LOW_URGENCY",
]);

const FINAL_DECISION_OUTCOME_ACTIONS = new Set<string>(["SWITCH", "KEEP"]);

const NEGOTIATION_OUTCOME_ACTIONS = new Set<string>([
  "NEGOTIATE",
  "USED_FOR_NEGOTIATION",
]);

export const recordOutcomeSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
    buyerAction: z.enum(OUTCOME_ACTIONS),
    actualSupplier: z.string().max(256).optional(),
    actualUnitPrice: z.string().optional(),
    actualDeliveryDays: z.number().int().min(0).optional(),
    qualityResult: z
      .enum(["GOOD", "ACCEPTABLE", "POOR", "DISPUTED"])
      .optional(),
    disputeOccurred: z.boolean().optional(),
    reorderOccurred: z.boolean().optional(),
    buyerSatisfaction: z.number().int().min(1).max(5).optional(),
    learningNote: z.string().max(4096).optional(),
    moneySaved: z.string().max(128).optional(),
    timeSaved: z.string().max(128).optional(),
    riskReduced: z.string().max(32).optional(),
    dependencyReduced: z.string().max(32).optional(),
    trustImproved: z.string().max(32).optional(),
    proofImproved: z.string().max(32).optional(),
    buyerUnderstoodReport: z.string().max(32).optional(),
    operatorTimeSpent: z.string().max(128).optional(),
    lessonLearned: z.string().max(4096).optional(),
    failedOutcomeReason: z.string().max(4096).optional(),
    linkedReportId: z.string().optional(),
  })
  .strict();

type RecordOutcomeInput = z.infer<typeof recordOutcomeSchema>;

function buildOutcomeLearningNote(
  parsed: RecordOutcomeInput,
): string | undefined {
  const lines: string[] = [];

  if (parsed.learningNote) lines.push(parsed.learningNote);
  if (parsed.lessonLearned)
    lines.push(`Lesson learned: ${parsed.lessonLearned}`);
  if (parsed.failedOutcomeReason) {
    lines.push(`Failed outcome reason: ${parsed.failedOutcomeReason}`);
  }

  const painRelief = [
    ["Money saved", parsed.moneySaved],
    ["Time saved", parsed.timeSaved],
    ["Risk reduced", parsed.riskReduced],
    ["Dependency reduced", parsed.dependencyReduced],
    ["Trust improved", parsed.trustImproved],
    ["Proof improved", parsed.proofImproved],
    ["Buyer understood report", parsed.buyerUnderstoodReport],
    ["Operator time spent", parsed.operatorTimeSpent],
  ].filter(([, value]) => value);

  if (painRelief.length > 0) {
    lines.push(
      painRelief.map(([label, value]) => `${label}: ${value}`).join("; "),
    );
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function parseOptionalDecimal(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("INVALID_OUTCOME_AMOUNT");
  return value;
}

function parseYesNo(value: string | undefined): boolean | null {
  if (!value || value === "UNKNOWN") return null;
  if (value === "YES") return true;
  if (value === "NO") return false;
  return null;
}

export type RecordOutcomeResult = {
  id: string;
  buyerAction: string;
};

export const recordOutcomeAction = registerAction<
  z.infer<typeof recordOutcomeSchema>,
  RecordOutcomeResult
>({
  name: "sourcing.recordOutcome",
  description:
    "Record the post-decision outcome of a Supplier Switch case. Closes the learning loop.",
  riskLevel: "LOW",
  allowedRoles: [...DEFAULT_ADMIN_ROLES, "OPERATOR"],
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = recordOutcomeSchema.parse(input);
    const database = db(context);
    const run = await database.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true, requirement: true, metadata: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const tradePainMetadata = parseTradePainMetadata(
      run?.requirement,
      run?.metadata,
    );

    const report = await database.switchDecisionReport.findFirst({
      where: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, buyerDecision: true },
    });

    if (
      !report?.buyerDecision &&
      !FAILED_OUTCOME_ACTIONS.has(parsed.buyerAction)
    ) {
      throw new Error("BUYER_DECISION_REQUIRED_BEFORE_OUTCOME");
    }

    if (
      FINAL_DECISION_OUTCOME_ACTIONS.has(parsed.buyerAction) &&
      isWeakDecisionAuthority(tradePainMetadata.decisionAuthorityLevel)
    ) {
      throw new Error("FINAL_DECISION_AUTHORITY_REQUIRED");
    }

    if (
      NEGOTIATION_OUTCOME_ACTIONS.has(parsed.buyerAction) &&
      ["UNKNOWN", "NO_AUTHORITY", "INFLUENCER"].includes(
        tradePainMetadata.decisionAuthorityLevel,
      )
    ) {
      throw new Error("FINAL_DECISION_AUTHORITY_REQUIRED");
    }

    const learningNote = buildOutcomeLearningNote(parsed);
    if (
      FAILED_OUTCOME_ACTIONS.has(parsed.buyerAction) &&
      !parsed.failedOutcomeReason
    ) {
      throw new Error("FAILED_OUTCOME_REASON_REQUIRED");
    }

    const outcome = await database.outcomeRecord.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        buyerAction: parsed.buyerAction,
        actualSupplier: parsed.actualSupplier,
        actualUnitPrice: parsed.actualUnitPrice,
        actualDeliveryDays: parsed.actualDeliveryDays,
        qualityResult: parsed.qualityResult,
        disputeOccurred: parsed.disputeOccurred ?? false,
        reorderOccurred: parsed.reorderOccurred ?? false,
        buyerSatisfaction: parsed.buyerSatisfaction,
        learningNote,
        moneySaved: parseOptionalDecimal(parsed.moneySaved),
        timeSaved: parsed.timeSaved,
        riskReduced: parsed.riskReduced,
        dependencyReduced: parsed.dependencyReduced,
        trustImproved: parsed.trustImproved,
        proofImproved: parsed.proofImproved,
        buyerUnderstoodReport: parseYesNo(parsed.buyerUnderstoodReport),
        operatorTimeSpent: parsed.operatorTimeSpent,
        lessonLearned: parsed.lessonLearned,
        failedOutcomeReason: parsed.failedOutcomeReason,
        linkedReportId: parsed.linkedReportId ?? report?.id,
      },
      select: { id: true, buyerAction: true },
    });

    return { id: outcome.id, buyerAction: outcome.buyerAction };
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
    const entitlement = await checkEntitlement(
      parsed.organizationId,
      "checkpoints",
    );
    if (!entitlement.allowed) {
      throw new Error("ENTITLEMENT_EXCEEDED");
    }
    if (parsed.sourcingRunId) {
      const run = await prisma.sourcingRun.findUnique({
        where: { id: parsed.sourcingRunId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    }
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
      select: { organizationId: true, status: true, sourcingRunId: true },
    });
    validateRecordBelongsToOrg(cp, parsed.organizationId, "CHECKPOINT");
    if (cp?.status !== "DELIVERED") throw new Error("CHECKPOINT_NOT_DELIVERED");

    const evidenceCount = await prisma.evidenceItem.count({
      where: {
        organizationId: parsed.organizationId,
        OR: [
          { relatedType: "WORK_CHECKPOINT", relatedId: parsed.checkpointId },
          ...(cp?.sourcingRunId
            ? [{ sourcingRunId: cp.sourcingRunId } as const]
            : []),
        ],
      },
    });
    if (evidenceCount <= 0) {
      throw new Error("CHECKPOINT_EVIDENCE_REQUIRED");
    }
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
    if (parsed.sourcingRunId) {
      const run = await prisma.sourcingRun.findUnique({
        where: { id: parsed.sourcingRunId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    }
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

export type BuyerDecisionReport = {
  sourcingRunId: string;
  summary: string;
  recommendedSupplierName?: string;
  expectedSavings?: number;
  currency?: string;
  quoteTable: Array<{
    supplierName: string;
    unitPrice?: number;
    totalAmount?: number;
    moq?: string;
    leadTime?: string;
    riskScore?: number;
    evidenceIds: string[];
  }>;
  risks: string[];
  missingInformation: string[];
  nextActions: string[];
};

export const generateBuyerReportSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export const generateBuyerReportAction = registerAction<
  z.infer<typeof generateBuyerReportSchema>,
  BuyerDecisionReport
>({
  name: "sourcing.generateBuyerReport",
  description:
    "Generate a buyer-facing decision report from stored quotes and evidence of a sourcing run. AI cannot deliver without human approval.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = generateBuyerReportSchema.parse(input);
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: {
        organizationId: true,
        title: true,
        requirement: true,
        status: true,
        currency: true,
      },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");

    const quotes = await prisma.supplierQuote.findMany({
      where: { sourcingRunId: parsed.sourcingRunId },
      orderBy: { comparisonRank: "asc" },
      include: {
        supplierCandidate: {
          select: { name: true },
        },
      },
    });

    const evidence = await prisma.evidenceItem.findMany({
      where: { sourcingRunId: parsed.sourcingRunId },
      select: { id: true, relatedId: true },
    });

    const evidenceByRelatedId = new Map<string, string[]>();
    for (const e of evidence) {
      const key = e.relatedId ?? "";
      if (!evidenceByRelatedId.has(key)) evidenceByRelatedId.set(key, []);
      evidenceByRelatedId.get(key)!.push(e.id);
    }

    const quoteTable = quotes.map((q) => ({
      supplierName: q.supplierCandidate?.name ?? "Unknown Supplier",
      unitPrice: q.unitPrice ? Number(q.unitPrice) : undefined,
      totalAmount: q.totalAmount ? Number(q.totalAmount) : undefined,
      moq: q.moq ?? undefined,
      leadTime: q.leadTime ?? undefined,
      riskScore: q.riskScore ?? undefined,
      evidenceIds: evidenceByRelatedId.get(q.id) ?? [],
    }));

    const bestPrice = [...quotes]
      .filter((q) => q.totalAmount)
      .sort((a, b) => Number(a.totalAmount!) - Number(b.totalAmount!))[0];
    const bestRisk = [...quotes]
      .filter((q) => q.riskScore != null)
      .sort((a, b) => (a.riskScore ?? 50) - (b.riskScore ?? 50))[0];

    const risks: string[] = [];
    if (
      !["COMPARED", "READY_FOR_REVIEW", "REPORT_DELIVERED"].includes(
        run?.status ?? "",
      )
    ) {
      risks.push("Sourcing run has not been delivered as complete");
    }
    const quotesWithHighRisk = quotes.filter((q) => (q.riskScore ?? 0) > 70);
    for (const q of quotesWithHighRisk) {
      risks.push(
        `High risk supplier: ${q.supplierCandidate?.name ?? "Unknown"} (risk score: ${q.riskScore})`,
      );
    }

    const missingInformation: string[] = [];
    if (quotes.some((q) => !q.moq)) missingInformation.push("MOQ");
    if (quotes.some((q) => !q.leadTime)) missingInformation.push("Lead time");
    if (quotes.some((q) => !q.shippingTerm))
      missingInformation.push("Shipping terms");
    if (quotes.some((q) => !q.paymentTerm))
      missingInformation.push("Payment terms");

    return {
      sourcingRunId: parsed.sourcingRunId,
      summary: `Buyer decision report for: ${run?.title ?? "Sourcing Run"}`,
      recommendedSupplierName: bestPrice?.supplierCandidate?.name,
      expectedSavings: bestPrice?.totalAmount
        ? quotes.length > 1
          ? Math.max(
              ...quotes
                .filter((q) => q.totalAmount)
                .map((q) => Number(q.totalAmount)),
            ) -
            Math.min(
              ...quotes
                .filter((q) => q.totalAmount)
                .map((q) => Number(q.totalAmount)),
            )
          : undefined
        : undefined,
      currency: run?.currency ?? "USD",
      quoteTable,
      risks,
      missingInformation,
      nextActions: [
        bestPrice
          ? `Consider supplier with best price: ${bestPrice.supplierCandidate?.name}`
          : "Collect more quotes before making a decision",
        bestRisk
          ? `Lowest risk supplier: ${bestRisk.supplierCandidate?.name}`
          : "Risk assessment incomplete",
        ...(missingInformation.length > 0
          ? [`Request missing information: ${missingInformation.join(", ")}`]
          : []),
        "Review report and approve for buyer delivery",
      ],
    };
  },
});

export const markAsBilledSchema = z
  .object({
    organizationId: z.string().min(1),
    checkpointId: z.string().min(1),
    invoiceId: z.string().max(256).optional(),
    amount: z.number().min(0),
    currency: z.string().max(8).optional(),
    provider: z.string().max(64).optional(),
    externalPaymentId: z.string().max(256).optional(),
  })
  .strict();

export const markAsBilledAction = registerAction<
  z.infer<typeof markAsBilledSchema>,
  { status: string; paymentId: string }
>({
  name: "checkpoint.markAsBilled",
  description:
    "Mark an approved checkpoint as billed and record the payment. Only OWNER can execute.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    assertKillSwitchEnabled("BILLING_SIDE_EFFECTS_ENABLED");
    const parsed = markAsBilledSchema.parse(input);
    const cp = await prisma.workCheckpoint.findUnique({
      where: { id: parsed.checkpointId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(cp, parsed.organizationId, "CHECKPOINT");
    if (cp?.status !== "APPROVED") throw new Error("CHECKPOINT_NOT_APPROVED");

    const [updated, payment] = await prisma.$transaction([
      prisma.workCheckpoint.update({
        where: { id: parsed.checkpointId },
        data: {
          status: "BILLED",
          updatedAt: new Date(),
        },
        select: { status: true },
      }),
      prisma.payment.create({
        data: {
          organizationId: parsed.organizationId,
          checkpointId: parsed.checkpointId,
          invoiceId: parsed.invoiceId,
          amount: parsed.amount,
          currency: parsed.currency ?? "USD",
          provider: parsed.provider ?? "manual",
          externalPaymentId: parsed.externalPaymentId,
          status: "COMPLETED",
        },
        select: { id: true },
      }),
    ]);

    return { status: updated.status, paymentId: payment.id };
  },
});

export const recordPaymentSchema = z
  .object({
    organizationId: z.string().min(1),
    checkpointId: z.string().min(1),
    invoiceId: z.string().max(256).optional(),
    amount: z.number().min(0),
    currency: z.string().max(8).optional(),
    provider: z.string().max(64).optional(),
    externalPaymentId: z.string().max(256).optional(),
    metadata: z.any().optional(),
  })
  .strict();

export const recordPaymentAction = registerAction<
  z.infer<typeof recordPaymentSchema>,
  { paymentId: string }
>({
  name: "checkpoint.recordPayment",
  description:
    "Record a payment for an already-billed checkpoint (e.g. from Stripe webhook callback). Only OWNER can execute.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = recordPaymentSchema.parse(input);
    const cp = await prisma.workCheckpoint.findUnique({
      where: { id: parsed.checkpointId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(cp, parsed.organizationId, "CHECKPOINT");
    if (cp?.status !== "BILLED") throw new Error("CHECKPOINT_NOT_BILLED");

    if (parsed.externalPaymentId && parsed.provider) {
      const existing = await prisma.payment.findUnique({
        where: {
          provider_externalPaymentId: {
            provider: parsed.provider,
            externalPaymentId: parsed.externalPaymentId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return { paymentId: existing.id };
      }
    }

    const payment = await prisma.payment.create({
      data: {
        organizationId: parsed.organizationId,
        checkpointId: parsed.checkpointId,
        invoiceId: parsed.invoiceId,
        amount: parsed.amount,
        currency: parsed.currency ?? "USD",
        provider: parsed.provider ?? "external",
        externalPaymentId: parsed.externalPaymentId,
        status: "COMPLETED",
        metadata: parsed.metadata,
      },
      select: { id: true },
    });

    return { paymentId: payment.id };
  },
});

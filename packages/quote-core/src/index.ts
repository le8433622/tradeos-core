import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
  type ActionContext,
} from "@tradeos/policy-core";
import { z, ZodError } from "zod";

function safeParse<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) throw new Error("INVALID_REQUEST_BODY");
    throw error;
  }
}

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

// ─── Draft Quote ───────────────────────────────────────

export const draftQuoteSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    supplierName: z.string().min(1).max(256),
    buyPrice: z.number().positive(),
    currency: z.string().min(1).max(8),
    quantity: z.number().positive().optional(),
    unit: z.string().max(64).optional(),
    shippingCost: z.number().min(0).optional(),
    handlingCost: z.number().min(0).optional(),
    riskBuffer: z.number().min(0).optional(),
    taxOrFee: z.number().min(0).optional(),
    targetMarginPercent: z.number().min(0).max(100).optional(),
    deliveryEstimate: z.string().max(256).optional(),
    refundTerms: z.string().max(2048).optional(),
    quoteExpiresAt: z.string().datetime().optional(),
    riskNotes: z.string().max(4096).optional(),
    evidenceIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

function validateQuoteGates(input: z.infer<typeof draftQuoteSchema>): string[] {
  const warnings: string[] = [];
  if (input.buyPrice === undefined || input.buyPrice <= 0) {
    throw new Error("QUOTE_BUY_PRICE_REQUIRED");
  }
  if (input.shippingCost === undefined && !input.riskNotes) {
    warnings.push("QUOTE_SHIPPING_MISSING_NEEDS_OVERRIDE");
  }
  if (
    input.targetMarginPercent !== undefined &&
    input.targetMarginPercent < 5 &&
    !input.riskNotes
  ) {
    warnings.push("QUOTE_LOW_MARGIN_NEEDS_APPROVAL");
  }
  return warnings;
}

export const draftQuoteAction = registerAction<
  z.infer<typeof draftQuoteSchema>,
  { id: string; warnings: string[] }
>({
  name: "quote.draft",
  description: "Create a draft quote from product/supplier evidence.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(draftQuoteSchema, input);
    const warnings = validateQuoteGates(parsed);

    if (parsed.sourcingRunId) {
      const run = await db(context).sourcingRun.findUnique({
        where: { id: parsed.sourcingRunId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    }

    const salePrice =
      parsed.buyPrice +
      (parsed.shippingCost ?? 0) +
      (parsed.handlingCost ?? 0) +
      (parsed.riskBuffer ?? 0) +
      (parsed.taxOrFee ?? 0);

    const grossProfit =
      parsed.targetMarginPercent !== undefined
        ? Math.round(salePrice * (parsed.targetMarginPercent / 100) * 100) / 100
        : undefined;

    const finalSalePrice =
      grossProfit !== undefined ? salePrice + grossProfit : salePrice;

    const depositAmount = parsed.buyPrice * (parsed.quantity ?? 1) * 0.3;

    const quote = await db(context).quoteDraft.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        title: parsed.title,
        supplierName: parsed.supplierName,
        buyPrice: parsed.buyPrice,
        currency: parsed.currency,
        quantity: parsed.quantity,
        unit: parsed.unit,
        shippingCost: parsed.shippingCost,
        handlingCost: parsed.handlingCost,
        riskBuffer: parsed.riskBuffer,
        taxOrFee: parsed.taxOrFee,
        targetMarginPercent: parsed.targetMarginPercent,
        salePrice: finalSalePrice,
        grossProfit,
        depositAmount,
        deliveryEstimate: parsed.deliveryEstimate,
        refundTerms: parsed.refundTerms,
        quoteExpiresAt: parsed.quoteExpiresAt
          ? new Date(parsed.quoteExpiresAt)
          : undefined,
        riskNotes: parsed.riskNotes,
        evidenceIds: parsed.evidenceIds ?? undefined,
        status: warnings.length > 0 ? "NEEDS_MORE_COST_DATA" : "DRAFT",
        createdBy: context.actorUserId,
      },
      select: { id: true },
    });

    return { id: quote.id, warnings };
  },
});

// ─── Approve Quote ─────────────────────────────────────

export const approveQuoteSchema = z
  .object({
    organizationId: z.string().min(1),
    quoteId: z.string().min(1),
    approvalNotes: z.string().max(4096).optional(),
  })
  .strict();

export const approveQuoteAction = registerAction<
  z.infer<typeof approveQuoteSchema>,
  { id: string; status: string }
>({
  name: "quote.approve",
  description: "Founder-approve a quote before sending to customer.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(approveQuoteSchema, input);

    const quote = await db(context).quoteDraft.findUnique({
      where: { id: parsed.quoteId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(quote, parsed.organizationId, "QUOTE_DRAFT");
    if (!quote) throw new Error("QUOTE_NOT_FOUND");

    if (quote.status === "APPROVED") {
      throw new Error("QUOTE_ALREADY_APPROVED");
    }
    if (quote.status === "SENT" || quote.status === "ACCEPTED") {
      throw new Error("QUOTE_CANNOT_MODIFY");
    }

    const updated = await db(context).quoteDraft.update({
      where: { id: parsed.quoteId },
      data: {
        status: "APPROVED",
        approvedBy: context.actorUserId,
        approvedAt: new Date(),
        metadata: parsed.approvalNotes
          ? { approvalNotes: parsed.approvalNotes }
          : undefined,
      },
      select: { id: true, status: true },
    });

    return { id: updated.id, status: updated.status };
  },
});

// ─── Mark Quote Sent ───────────────────────────────────

export const markSentSchema = z
  .object({
    organizationId: z.string().min(1),
    quoteId: z.string().min(1),
  })
  .strict();

export const markSentAction = registerAction<
  z.infer<typeof markSentSchema>,
  { id: string; status: string }
>({
  name: "quote.markSent",
  description: "Mark a quote as sent to the customer.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(markSentSchema, input);

    const quote = await db(context).quoteDraft.findUnique({
      where: { id: parsed.quoteId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(quote, parsed.organizationId, "QUOTE_DRAFT");
    if (!quote) throw new Error("QUOTE_NOT_FOUND");

    if (quote.status !== "APPROVED") {
      throw new Error("QUOTE_MUST_BE_APPROVED_BEFORE_SENT");
    }

    const updated = await db(context).quoteDraft.update({
      where: { id: parsed.quoteId },
      data: { status: "SENT", sentAt: new Date() },
      select: { id: true, status: true },
    });

    return { id: updated.id, status: updated.status };
  },
});

// ─── Customer Accept ───────────────────────────────────

export const customerAcceptSchema = z
  .object({
    organizationId: z.string().min(1),
    quoteId: z.string().min(1),
    customerNotes: z.string().max(4096).optional(),
  })
  .strict();

export const customerAcceptAction = registerAction<
  z.infer<typeof customerAcceptSchema>,
  { id: string; status: string }
>({
  name: "quote.customerAccept",
  description: "Record customer acceptance of a sent quote.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(customerAcceptSchema, input);

    const quote = await db(context).quoteDraft.findUnique({
      where: { id: parsed.quoteId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(quote, parsed.organizationId, "QUOTE_DRAFT");
    if (!quote) throw new Error("QUOTE_NOT_FOUND");

    if (quote.status !== "SENT") {
      throw new Error("QUOTE_MUST_BE_SENT_BEFORE_ACCEPT");
    }

    const updated = await db(context).quoteDraft.update({
      where: { id: parsed.quoteId },
      data: {
        status: "ACCEPTED",
        customerAcceptedAt: new Date(),
        metadata: parsed.customerNotes
          ? { customerNotes: parsed.customerNotes }
          : undefined,
      },
      select: { id: true, status: true },
    });

    return { id: updated.id, status: updated.status };
  },
});

// ─── Customer Reject ───────────────────────────────────

export const customerRejectSchema = z
  .object({
    organizationId: z.string().min(1),
    quoteId: z.string().min(1),
    rejectReason: z.string().min(1).max(4096),
  })
  .strict();

export const customerRejectAction = registerAction<
  z.infer<typeof customerRejectSchema>,
  { id: string; status: string }
>({
  name: "quote.customerReject",
  description: "Record customer rejection of a sent quote.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(customerRejectSchema, input);

    const quote = await db(context).quoteDraft.findUnique({
      where: { id: parsed.quoteId },
      select: { organizationId: true, status: true },
    });
    validateRecordBelongsToOrg(quote, parsed.organizationId, "QUOTE_DRAFT");
    if (!quote) throw new Error("QUOTE_NOT_FOUND");

    if (quote.status !== "SENT") {
      throw new Error("QUOTE_MUST_BE_SENT_BEFORE_REJECT");
    }

    const updated = await db(context).quoteDraft.update({
      where: { id: parsed.quoteId },
      data: {
        status: "REJECTED",
        customerRejectedAt: new Date(),
        riskNotes: parsed.rejectReason,
      },
      select: { id: true, status: true },
    });

    return { id: updated.id, status: updated.status };
  },
});

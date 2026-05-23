import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  DEFAULT_LOW_RISK_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
} from "@tradeos/policy-core";
import type { ActionContext } from "@tradeos/policy-core";
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

export type QuotationLineItemInput = {
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  currency?: string;
};

export type DraftQuotationInput = {
  organizationId: string;
  leadId?: string;
  title: string;
  requirements: string;
  currency?: string;
  estimatedAmount?: number;
  items?: QuotationLineItemInput[];
};

export type SuggestPartnerInput = {
  organizationId: string;
  need: string;
  country?: string;
  category?: string;
};

export type CreateProductInput = {
  organizationId: string;
  name: string;
  category?: string;
  description?: string;
  originCountry?: string;
  priceRange?: string;
  moq?: string;
  certification?: string;
};

export type UpdateProductInput = {
  organizationId: string;
  productId: string;
  name?: string;
  category?: string;
  description?: string;
  originCountry?: string;
  priceRange?: string;
  moq?: string;
  certification?: string;
};

export type ProposeIntroductionInput = {
  organizationId: string;
  buyerOrgId: string;
  sellerOrgId: string;
  buyerNote?: string;
  sellerNote?: string;
};

export type ApproveIntroductionInput = {
  organizationId: string;
  introductionId: string;
  note?: string;
  contactId?: string;
};

export type DisputeIntroductionInput = {
  organizationId: string;
  introductionId: string;
  reason: string;
};

export type ReportIntroductionValueInput = {
  organizationId: string;
  introductionId: string;
  valueGenerated: string;
};

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

export const draftQuotationAction = registerAction<
  DraftQuotationInput,
  unknown
>({
  name: "trade.draftQuotation",
  description:
    "Create a draft quotation. AI may draft, but human must review before sending.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(draftQuotationSchema, input);
    const client = db(context);
    if (parsed.leadId) {
      const lead = await client.lead.findUnique({
        where: { id: parsed.leadId },
      });
      validateRecordBelongsToOrg(lead, parsed.organizationId, "LEAD");
    }

    let totalAmount = parsed.estimatedAmount ?? undefined;

    if (parsed.items && parsed.items.length > 0) {
      const productIds = [
        ...new Set(parsed.items.map((item) => item.productId).filter(Boolean)),
      ] as string[];
      if (productIds.length > 0) {
        const products = await client.product.findMany({
          where: {
            id: { in: productIds },
            organizationId: parsed.organizationId,
          },
          select: { id: true },
        });
        if (products.length !== productIds.length) {
          throw new Error("PRODUCT_BELONGS_TO_ANOTHER_ORGANIZATION");
        }
      }

      for (const item of parsed.items) {
        if (!Number.isFinite(item.quantity) || item.quantity <= 0)
          throw new Error("INVALID_QUOTATION_ITEM_QUANTITY");
        if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0)
          throw new Error("INVALID_QUOTATION_ITEM_PRICE");
      }

      totalAmount = parsed.items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);
    }

    return client.quotation.create({
      data: {
        organizationId: parsed.organizationId,
        leadId: parsed.leadId,
        title: parsed.title,
        content: parsed.requirements,
        status: "DRAFT",
        totalAmount,
        currency: parsed.currency,
        lineItems: parsed.items
          ? {
              create: parsed.items.map((item) => ({
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                currency: item.currency ?? parsed.currency,
                totalAmount: item.quantity * item.unitPrice,
              })),
            }
          : undefined,
      },
      include: { lineItems: true },
    });
  },
});

export const sendQuotationAction = registerAction<
  { quotationId: string },
  unknown
>({
  name: "trade.sendQuotation",
  description:
    "Send a quotation to a customer. AI is not allowed to execute without approval.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(sendQuotationSchema, input);
    const client = db(context);
    const quotation = await client.quotation.findUnique({
      where: { id: parsed.quotationId },
    });
    validateRecordBelongsToOrg(quotation, context.organizationId!, "QUOTATION");
    return client.quotation.update({
      where: { id: parsed.quotationId },
      data: { status: "SENT" },
    });
  },
});

export const suggestPartnerAction = registerAction<
  SuggestPartnerInput,
  { suggestions: unknown[] }
>({
  name: "trade.suggestPartner",
  description:
    "Suggest buyer, seller, logistics, or service partners for a trade need.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(suggestPartnerSchema, input);
    const client = db(context);
    const suggestions = await client.company.findMany({
      where: {
        organizationId: parsed.organizationId,
        ...(parsed.country ? { country: parsed.country } : {}),
        ...(parsed.category
          ? { industry: { contains: parsed.category, mode: "insensitive" } }
          : {}),
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    return { suggestions };
  },
});

export const createProductAction = registerAction<CreateProductInput, unknown>({
  name: "trade.createProduct",
  description: "Create a product for the tenant catalog.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(createProductSchema, input);
    return db(context).product.create({
      data: {
        organizationId: parsed.organizationId,
        name: parsed.name,
        category: parsed.category,
        description: parsed.description,
        originCountry: parsed.originCountry,
        priceRange: parsed.priceRange,
        moq: parsed.moq,
        certification: parsed.certification,
      },
    });
  },
});

export const updateProductAction = registerAction<UpdateProductInput, unknown>({
  name: "trade.updateProduct",
  description: "Update a product in the tenant catalog.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateProductSchema, input);
    const client = db(context);
    const product = await client.product.findUnique({
      where: { id: parsed.productId },
    });
    validateRecordBelongsToOrg(product, parsed.organizationId, "PRODUCT");

    return client.product.update({
      where: { id: parsed.productId },
      data: {
        name: parsed.name,
        category: parsed.category,
        description: parsed.description,
        originCountry: parsed.originCountry,
        priceRange: parsed.priceRange,
        moq: parsed.moq,
        certification: parsed.certification,
      },
    });
  },
});

export const proposeIntroductionAction = registerAction<
  ProposeIntroductionInput,
  unknown
>({
  name: "trade.proposeIntroduction",
  description:
    "Propose a buyer/seller introduction between two opted-in tenants. Association operators only.",
  riskLevel: "MEDIUM",
  allowedRoles: ["OWNER", "ADMIN", "OPERATOR"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(proposeIntroductionSchema, input);
    const client = db(context);
    const [buyerOrg, sellerOrg] = await Promise.all([
      client.organization.findUnique({ where: { id: parsed.buyerOrgId } }),
      client.organization.findUnique({ where: { id: parsed.sellerOrgId } }),
    ]);
    if (!buyerOrg || !sellerOrg) throw new Error("ORGANIZATION_NOT_FOUND");
    if (!buyerOrg.introductionsEnabled)
      throw new Error("BUYER_ORG_NOT_OPTED_IN");
    if (!sellerOrg.introductionsEnabled)
      throw new Error("SELLER_ORG_NOT_OPTED_IN");

    return client.introductionRequest.create({
      data: {
        proposerOrgId: parsed.organizationId,
        buyerOrgId: parsed.buyerOrgId,
        sellerOrgId: parsed.sellerOrgId,
        buyerNote: parsed.buyerNote,
        sellerNote: parsed.sellerNote,
      },
    });
  },
});

export const approveIntroductionAction = registerAction<
  ApproveIntroductionInput,
  unknown
>({
  name: "trade.approveIntroduction",
  description:
    "Approve an introduction request as the buyer or seller organization.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER", "ADMIN"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(approveIntroductionSchema, input);
    const client = db(context);
    const request = await client.introductionRequest.findUnique({
      where: { id: parsed.introductionId },
    });
    if (!request) throw new Error("INTRODUCTION_REQUEST_NOT_FOUND");

    const isBuyer = parsed.organizationId === request.buyerOrgId;
    const isSeller = parsed.organizationId === request.sellerOrgId;
    if (!isBuyer && !isSeller) throw new Error("ORGANIZATION_ACCESS_DENIED");

    const update: Record<string, unknown> = {};
    if (parsed.contactId) {
      const contact = await client.contact.findUnique({
        where: { id: parsed.contactId },
      });
      validateRecordBelongsToOrg(contact, parsed.organizationId, "CONTACT");
    }

    if (isBuyer && request.status === "PENDING_BUYER_APPROVAL") {
      update.status = "PENDING_SELLER_APPROVAL";
      if (parsed.note) update.buyerNote = parsed.note;
      if (parsed.contactId) update.buyerContactId = parsed.contactId;
    } else if (isSeller && request.status === "PENDING_SELLER_APPROVAL") {
      update.status = "APPROVED";
      if (parsed.note) update.sellerNote = parsed.note;
      if (parsed.contactId) update.sellerContactId = parsed.contactId;
    } else {
      throw new Error("INVALID_APPROVAL_TRANSITION");
    }

    return client.introductionRequest.update({
      where: { id: parsed.introductionId },
      data: update,
      include: {
        buyerOrg: { select: { id: true, name: true } },
        sellerOrg: { select: { id: true, name: true } },
      },
    });
  },
});

export const rejectIntroductionAction = registerAction<
  ApproveIntroductionInput,
  unknown
>({
  name: "trade.rejectIntroduction",
  description:
    "Reject an introduction request as the buyer or seller organization.",
  riskLevel: "MEDIUM",
  allowedRoles: ["OWNER", "ADMIN"],
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(rejectIntroductionSchema, input);
    const client = db(context);
    const request = await client.introductionRequest.findUnique({
      where: { id: parsed.introductionId },
    });
    if (!request) throw new Error("INTRODUCTION_REQUEST_NOT_FOUND");

    const isBuyer = parsed.organizationId === request.buyerOrgId;
    const isSeller = parsed.organizationId === request.sellerOrgId;
    if (!isBuyer && !isSeller) throw new Error("ORGANIZATION_ACCESS_DENIED");
    const canReject =
      (isBuyer && request.status === "PENDING_BUYER_APPROVAL") ||
      (isSeller && request.status === "PENDING_SELLER_APPROVAL");
    if (!canReject) throw new Error("INVALID_APPROVAL_TRANSITION");

    return client.introductionRequest.update({
      where: { id: parsed.introductionId },
      data: {
        status: "REJECTED",
        ...(isBuyer && parsed.note ? { buyerNote: parsed.note } : {}),
        ...(isSeller && parsed.note ? { sellerNote: parsed.note } : {}),
      },
    });
  },
});

export const disputeIntroductionAction = registerAction<
  DisputeIntroductionInput,
  unknown
>({
  name: "trade.disputeIntroduction",
  description: "Report an issue or dispute an approved introduction.",
  riskLevel: "LOW",
  allowedRoles: ["OWNER", "ADMIN", "SALES", "OPERATOR"],
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(disputeIntroductionSchema, input);
    const client = db(context);
    const request = await client.introductionRequest.findUnique({
      where: { id: parsed.introductionId },
    });
    if (!request) throw new Error("INTRODUCTION_REQUEST_NOT_FOUND");
    if (request.status !== "APPROVED")
      throw new Error("INTRODUCTION_NOT_APPROVED");
    const isBuyerOrSeller =
      parsed.organizationId === request.buyerOrgId ||
      parsed.organizationId === request.sellerOrgId;
    if (!isBuyerOrSeller) throw new Error("ORGANIZATION_ACCESS_DENIED");

    return client.introductionRequest.update({
      where: { id: parsed.introductionId },
      data: { status: "DISPUTED", disputeReason: parsed.reason },
    });
  },
});

export const quotationLineItemSchema = z
  .object({
    productId: z.string().min(1).optional(),
    description: z.string().min(1).max(512),
    quantity: z.number().min(0).positive(),
    unit: z.string().max(32).optional(),
    unitPrice: z.number().min(0),
    currency: z.string().max(8).optional(),
  })
  .strict();

export const draftQuotationSchema = z
  .object({
    organizationId: z.string().min(1),
    leadId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    requirements: z.string().max(16384),
    currency: z.string().max(8).optional(),
    estimatedAmount: z.number().min(0).optional(),
    items: z.array(quotationLineItemSchema).optional(),
  })
  .strict();

export const sendQuotationSchema = z
  .object({
    quotationId: z.string().min(1),
  })
  .strict();

export const suggestPartnerSchema = z
  .object({
    organizationId: z.string().min(1),
    need: z.string().min(1).max(4096),
    country: z.string().max(128).optional(),
    category: z.string().max(128).optional(),
  })
  .strict();

export const createProductSchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().min(1).max(256),
    category: z.string().max(128).optional(),
    description: z.string().max(4096).optional(),
    originCountry: z.string().max(128).optional(),
    priceRange: z.string().max(128).optional(),
    moq: z.string().max(64).optional(),
    certification: z.string().max(256).optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    organizationId: z.string().min(1),
    productId: z.string().min(1),
    name: z.string().max(256).optional(),
    category: z.string().max(128).optional(),
    description: z.string().max(4096).optional(),
    originCountry: z.string().max(128).optional(),
    priceRange: z.string().max(128).optional(),
    moq: z.string().max(64).optional(),
    certification: z.string().max(256).optional(),
  })
  .strict();

export const proposeIntroductionSchema = z
  .object({
    organizationId: z.string().min(1),
    buyerOrgId: z.string().min(1),
    sellerOrgId: z.string().min(1),
    buyerNote: z.string().max(2048).optional(),
    sellerNote: z.string().max(2048).optional(),
  })
  .strict();

export const approveIntroductionSchema = z
  .object({
    organizationId: z.string().min(1),
    introductionId: z.string().min(1),
    note: z.string().max(2048).optional(),
    contactId: z.string().min(1).optional(),
  })
  .strict();

export const rejectIntroductionSchema = z
  .object({
    organizationId: z.string().min(1),
    introductionId: z.string().min(1),
    note: z.string().max(2048).optional(),
  })
  .strict();

export const disputeIntroductionSchema = z
  .object({
    organizationId: z.string().min(1),
    introductionId: z.string().min(1),
    reason: z.string().min(1).max(2048),
  })
  .strict();

export const reportIntroductionValueSchema = z
  .object({
    organizationId: z.string().min(1),
    introductionId: z.string().min(1),
    valueGenerated: z.string().min(1).max(128),
  })
  .strict();

export const reportIntroductionValueAction = registerAction<
  ReportIntroductionValueInput,
  unknown
>({
  name: "trade.reportIntroductionValue",
  description:
    "Report value generated from an approved introduction. Only buyer or seller can report value.",
  riskLevel: "LOW",
  allowedRoles: ["OWNER", "ADMIN", "OPERATOR"],
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(reportIntroductionValueSchema, input);
    const client = db(context);
    const request = await client.introductionRequest.findUnique({
      where: { id: parsed.introductionId },
    });
    if (!request) throw new Error("INTRODUCTION_REQUEST_NOT_FOUND");
    if (request.status !== "APPROVED")
      throw new Error("INTRODUCTION_NOT_APPROVED");
    const isBuyerOrSeller =
      parsed.organizationId === request.buyerOrgId ||
      parsed.organizationId === request.sellerOrgId;
    if (!isBuyerOrSeller) throw new Error("ORGANIZATION_ACCESS_DENIED");

    return client.introductionRequest.update({
      where: { id: parsed.introductionId },
      data: { valueGenerated: parsed.valueGenerated },
    });
  },
});

export function registerTradeActions() {
  return [
    draftQuotationAction,
    sendQuotationAction,
    suggestPartnerAction,
    createProductAction,
    updateProductAction,
    proposeIntroductionAction,
    approveIntroductionAction,
    rejectIntroductionAction,
    disputeIntroductionAction,
    reportIntroductionValueAction,
  ];
}

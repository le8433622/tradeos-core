import { z } from "zod";

export type ValidationError = { field: string; message: string };

export type ValidationResult<T> = {
  data: T;
  errors: ValidationError[];
  valid: boolean;
};

const MAX_STRING_LENGTH = 5000;
const MAX_PAYLOAD_BYTES = 256 * 1024;

const SESSION_MANAGED_FIELDS = ["organizationId", "organization_id", "orgId"];

export const createLeadSchema = z
  .object({
    source: z.string().min(1).max(256).optional(),
    name: z.string().max(256).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(256).optional(),
    need: z.string().max(4096).optional(),
    nextAction: z.string().max(256).optional(),
  })
  .strict();

export const createCompanySchema = z
  .object({
    name: z.string().min(1).max(256),
    country: z.string().max(128).optional(),
    industry: z.string().max(128).optional(),
    type: z
      .enum(["BUYER", "SELLER", "PARTNER", "LOGISTICS", "SERVICE", "OTHER"])
      .optional(),
    website: z.string().url().max(512).optional(),
    notes: z.string().max(4096).optional(),
  })
  .strict();

export const createContactSchema = z
  .object({
    companyId: z.string().min(1).optional(),
    name: z.string().max(256).optional(),
    email: z.string().email().max(256).optional(),
    phone: z.string().max(32).optional(),
    title: z.string().max(256).optional(),
    country: z.string().max(128).optional(),
  })
  .strict();

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(256),
    category: z.string().max(128).optional(),
    description: z.string().max(4096).optional(),
    originCountry: z.string().max(128).optional(),
    priceRange: z.string().max(128).optional(),
    moq: z.string().max(64).optional(),
    certification: z.string().max(256).optional(),
  })
  .strict();

export const createTaskSchema = z
  .object({
    leadId: z.string().min(1).optional(),
    assigneeId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    description: z.string().max(4096).optional(),
    dueAt: z.string().max(64).optional(),
  })
  .strict();

export const quotationLineItemSchema = z
  .object({
    description: z.string().min(1).max(512),
    quantity: z.number().min(0).positive(),
    unit: z.string().max(32).optional(),
    unitPrice: z.number().min(0),
    currency: z.string().max(8).optional(),
  })
  .strict();

export const createQuotationSchema = z
  .object({
    leadId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    content: z.string().max(16384).optional(),
    currency: z.string().max(8).optional(),
    totalAmount: z.number().min(0).optional(),
    items: z.array(quotationLineItemSchema).optional(),
  })
  .strict();

export const createApprovalSchema = z
  .object({
    actionName: z.string().min(1).max(256),
    input: z.any().optional(),
    reason: z.string().max(2048).optional(),
  })
  .strict();

export const updateOrganizationSettingsSchema = z
  .object({
    plan: z
      .enum(["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"])
      .optional(),
    mfaRequired: z.boolean().optional(),
    aiMonthlyBudget: z.number().min(0).optional(),
    avgDealValue: z.number().min(0).optional(),
    conversionRate: z.number().min(0).max(1).optional(),
    introductionsEnabled: z.boolean().optional(),
  })
  .strict();

export const createInvitationSchema = z
  .object({
    email: z.string().email().max(256),
    roleId: z.string().max(64).nullable().optional(),
  })
  .strict();

export const agentExecutionSchema = z
  .object({
    text: z.string().min(1).max(16384),
    channel: z.string().max(32).optional(),
    customerName: z.string().max(256).optional(),
    customerPhone: z.string().max(32).optional(),
    customerEmail: z.string().email().max(256).optional(),
  })
  .strict();

export const updateLeadStatusSchema = z
  .object({
    leadId: z.string().min(1),
    status: z.string().min(1).max(64),
  })
  .strict();

export const introductionActionSchema = z
  .object({
    action: z.enum(["approve", "reject", "dispute", "report-value"]),
    note: z.string().max(2048).optional(),
    contactId: z.string().min(1).optional(),
    reason: z.string().max(2048).optional(),
    valueGenerated: z.string().max(128).optional(),
  })
  .strict();

export const proposeIntroductionSchema = z
  .object({
    buyerOrgId: z.string().min(1),
    sellerOrgId: z.string().min(1),
    buyerNote: z.string().max(2048).optional(),
    sellerNote: z.string().max(2048).optional(),
  })
  .strict();

export function stripSessionManagedFields<T extends Record<string, unknown>>(
  input: T,
): T {
  const result = { ...input };
  for (const field of SESSION_MANAGED_FIELDS) {
    if (field in result) {
      delete result[field];
    }
  }
  return result;
}

export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  if (value.length > MAX_STRING_LENGTH)
    return value.slice(0, MAX_STRING_LENGTH);
  return value.replace(/<[^>]*>/g, "");
}

export function validateRequired(
  value: unknown,
  field: string,
  errors: ValidationError[],
) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    errors.push({ field, message: `${field} is required` });
  }
}

export function validateMaxLength(
  value: unknown,
  field: string,
  max: number,
  errors: ValidationError[],
) {
  if (typeof value === "string" && value.length > max) {
    errors.push({ field, message: `${field} exceeds ${max} characters` });
  }
}

export function checkPayloadSize(request: Request): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({
        error: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds ${MAX_PAYLOAD_BYTES / 1024}KB`,
      }),
      { status: 413, headers: { "content-type": "application/json" } },
    );
  }
  return null;
}

export function sanitizeInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

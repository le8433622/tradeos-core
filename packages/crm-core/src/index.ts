import crypto from "crypto";
import {
  prisma,
  Prisma,
  type CompanyType,
  type LeadStatus,
  type MemberStatus,
  type TenantPlan,
} from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  DEFAULT_LOW_RISK_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
  executeAction,
} from "@tradeos/policy-core";
import type { ActionContext, ActorRole } from "@tradeos/policy-core";
import { z } from "zod";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateLeadInput = {
  organizationId: string;
  source: string;
  name?: string;
  phone?: string;
  email?: string;
  need?: string;
  aiSummary?: string;
  nextAction?: string;
};

export type CreateFollowUpTaskInput = {
  organizationId: string;
  leadId?: string;
  assigneeId?: string;
  title: string;
  description?: string;
  dueAt?: string;
};

export type CreateCompanyInput = {
  organizationId: string;
  name: string;
  country?: string;
  industry?: string;
  type: CompanyType;
  website?: string;
  notes?: string;
};

export type UpdateCompanyInput = {
  organizationId: string;
  companyId: string;
  name?: string;
  country?: string;
  industry?: string;
  type?: CompanyType;
  website?: string;
  notes?: string;
};

export type CreateContactInput = {
  organizationId: string;
  companyId?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  country?: string;
};

export type UpdateContactInput = {
  organizationId: string;
  contactId: string;
  companyId?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  country?: string;
};

import { ZodError } from "zod";

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

function db(context: ActionContext) {
  return (context.prismaTransactionClient ?? prisma) as typeof prisma;
}

export const createLeadAction = registerAction<CreateLeadInput, unknown>({
  name: "crm.createLead",
  description:
    "Create a CRM lead from manual input or AI-extracted conversation data.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(createLeadSchema, input);
    return db(context).lead.create({
      data: {
        organizationId: parsed.organizationId,
        source: parsed.source,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        need: parsed.need,
        aiSummary: parsed.aiSummary,
        nextAction: parsed.nextAction,
      },
    });
  },
});

export const createFollowUpTaskAction = registerAction<
  CreateFollowUpTaskInput,
  unknown
>({
  name: "crm.createFollowUpTask",
  description: "Create a follow-up task for a lead or customer.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(createFollowUpTaskSchema, input);
    const client = db(context);
    if (parsed.leadId) {
      const lead = await client.lead.findUnique({
        where: { id: parsed.leadId },
      });
      validateRecordBelongsToOrg(lead, parsed.organizationId, "LEAD");
    }
    if (parsed.assigneeId) {
      const membership = await client.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: parsed.assigneeId,
            organizationId: parsed.organizationId,
          },
        },
      });
      if (!membership || membership.status !== "ACTIVE") {
        throw new Error("USER_BELONGS_TO_ANOTHER_ORGANIZATION");
      }
    }
    return client.task.create({
      data: {
        organizationId: parsed.organizationId,
        leadId: parsed.leadId,
        assigneeId: parsed.assigneeId,
        title: parsed.title,
        description: parsed.description,
        dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
      },
    });
  },
});

export const createCompanyAction = registerAction<CreateCompanyInput, unknown>({
  name: "crm.createCompany",
  description:
    "Create a company record for a buyer, seller, partner, or service provider.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(createCompanySchema, input);
    return db(context).company.create({
      data: {
        organizationId: parsed.organizationId,
        name: parsed.name,
        country: parsed.country,
        industry: parsed.industry,
        type: parsed.type,
        website: parsed.website,
        notes: parsed.notes,
      },
    });
  },
});

export const updateCompanyAction = registerAction<UpdateCompanyInput, unknown>({
  name: "crm.updateCompany",
  description: "Update a company record.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateCompanySchema, input);
    const client = db(context);
    const company = await client.company.findUnique({
      where: { id: parsed.companyId },
    });
    validateRecordBelongsToOrg(company, parsed.organizationId, "COMPANY");
    return client.company.update({
      where: { id: parsed.companyId },
      data: {
        name: parsed.name,
        country: parsed.country,
        industry: parsed.industry,
        type: parsed.type,
        website: parsed.website,
        notes: parsed.notes,
      },
    });
  },
});

export const createContactAction = registerAction<CreateContactInput, unknown>({
  name: "crm.createContact",
  description: "Create a contact record for a company.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(createContactSchema, input);
    const client = db(context);
    if (parsed.companyId) {
      const company = await client.company.findUnique({
        where: { id: parsed.companyId },
      });
      validateRecordBelongsToOrg(company, parsed.organizationId, "COMPANY");
    }
    return client.contact.create({ data: parsed });
  },
});

export const updateContactAction = registerAction<UpdateContactInput, unknown>({
  name: "crm.updateContact",
  description: "Update a contact record.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateContactSchema, input);
    const client = db(context);
    const contact = await client.contact.findUnique({
      where: { id: parsed.contactId },
    });
    validateRecordBelongsToOrg(contact, parsed.organizationId, "CONTACT");
    return client.contact.update({
      where: { id: parsed.contactId },
      data: {
        companyId: parsed.companyId,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        title: parsed.title,
        country: parsed.country,
      },
    });
  },
});

export const inviteUserAction = registerAction<
  z.infer<typeof inviteUserSchema>,
  { invitationId: string; token: string }
>({
  name: "user.invite",
  description: "Invite a user to the organization by email.",
  riskLevel: "MEDIUM",
  allowedRoles: ["OWNER", "ADMIN"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(inviteUserSchema, input);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    if (parsed.roleId) {
      const role = await db(context).role.findUnique({
        where: { id: parsed.roleId },
      });
      if (!role) throw new Error("INVALID_ROLE");
      if (!role.isSystem && role.organizationId !== context.organizationId) {
        throw new Error("INVALID_ROLE");
      }
    }
    const invitation = await db(context).invitation.create({
      data: {
        organizationId: parsed.organizationId,
        email: parsed.email,
        roleId: parsed.roleId ?? undefined,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });
    return { invitationId: invitation.id, token };
  },
});

export const draftNotificationAction = registerAction<
  z.infer<typeof draftNotificationSchema>,
  { id: string }
>({
  name: "notification.draft",
  description: "Draft a notification for an organization.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(draftNotificationSchema, input);
    const created = await db(context).notification.create({
      data: {
        organizationId: parsed.organizationId,
        title: parsed.title,
        body: parsed.body,
        audience: parsed.audience,
        status: "DRAFT",
      },
    });
    return { id: created.id };
  },
});

export const sendBulkNotificationAction = registerAction<
  z.infer<typeof sendBulkNotificationSchema>,
  { id: string; status: string }
>({
  name: "notification.sendBulk",
  description: "Send a bulk notification to all active organization members.",
  riskLevel: "MEDIUM",
  allowedRoles: ["OWNER", "ADMIN"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(sendBulkNotificationSchema, input);
    const notification = await db(context).notification.create({
      data: {
        organizationId: parsed.organizationId,
        title: parsed.title,
        body: parsed.body,
        audience: parsed.audience,
        status: "published",
      },
    });
    return { id: notification.id, status: notification.status as string };
  },
});

export const updateProfileAction = registerAction<
  z.infer<typeof updateProfileSchema>,
  { avgDealValue?: number; conversionRate?: number }
>({
  name: "organization.settings.updateProfile",
  description:
    "Update organization profile settings such as avg deal value and conversion rate.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateProfileSchema, input);
    const updated = await db(context).organization.update({
      where: { id: parsed.organizationId },
      data: {
        avgDealValue: parsed.avgDealValue,
        conversionRate: parsed.conversionRate,
      },
      select: { avgDealValue: true, conversionRate: true },
    });
    return {
      avgDealValue: updated.avgDealValue
        ? Number(updated.avgDealValue)
        : undefined,
      conversionRate: updated.conversionRate ?? undefined,
    };
  },
});

export const updateBillingPlanAction = registerAction<
  z.infer<typeof updateBillingPlanSchema>,
  { plan: string }
>({
  name: "billing.planUpdate",
  description: "Update organization billing plan.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(updateBillingPlanSchema, input);
    const updated = await db(context).organization.update({
      where: { id: parsed.organizationId },
      data: { plan: parsed.plan },
      select: { plan: true },
    });
    return { plan: updated.plan };
  },
});

export const updateAiBudgetAction = registerAction<
  z.infer<typeof updateAiBudgetSchema>,
  { aiMonthlyBudget: number }
>({
  name: "budget.update",
  description: "Update AI monthly budget.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateAiBudgetSchema, input);
    const updated = await db(context).organization.update({
      where: { id: parsed.organizationId },
      data: { aiMonthlyBudget: parsed.aiMonthlyBudget },
      select: { aiMonthlyBudget: true },
    });
    return { aiMonthlyBudget: Number(updated.aiMonthlyBudget) };
  },
});

export const trackAiUsageAction = registerAction<
  z.infer<typeof trackAiUsageSchema>,
  unknown
>({
  name: "ai.trackUsage",
  description: "Record an AI usage event for billing and quota tracking.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(trackAiUsageSchema, input);
    const client = db(context);
    await client.aiUsageEvent.create({ data: parsed });
  },
});

export const getAiBudgetAction = registerAction<
  z.infer<typeof getAiBudgetSchema>,
  { budget: number; spent: number }
>({
  name: "budget.getStatus",
  description: "Get AI monthly budget and current spend.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(getAiBudgetSchema, input);
    const client = db(context);
    const org = await client.organization.findUnique({
      where: { id: context.organizationId },
      select: { aiMonthlyBudget: true },
    });
    const budget = org?.aiMonthlyBudget ? Number(org.aiMonthlyBudget) : 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageRows = await client.aiUsageEvent.findMany({
      where: {
        organizationId: context.organizationId,
        createdAt: { gte: monthStart },
      },
      select: { estimatedCost: true },
    });
    const spent = usageRows.reduce(
      (sum, row) => sum + Number(row.estimatedCost),
      0,
    );
    return { budget, spent };
  },
});

export const updateSecurityAction = registerAction<
  z.infer<typeof updateSecuritySchema>,
  { mfaRequired: boolean }
>({
  name: "settings.security",
  description: "Update organization MFA policy. Requires MFA to change.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(updateSecuritySchema, input);
    const client = db(context);
    const updated = await client.organization.update({
      where: { id: parsed.organizationId },
      data: { mfaRequired: parsed.mfaRequired },
      select: { mfaRequired: true },
    });
    return { mfaRequired: updated.mfaRequired };
  },
});

export const updateIntroductionsAction = registerAction<
  z.infer<typeof updateIntroductionsSchema>,
  { introductionsEnabled: boolean }
>({
  name: "organization.settings.introductions",
  description:
    "Toggle introductions consent for cross-tenant partner matching.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(updateIntroductionsSchema, input);
    const client = db(context);
    const updated = await client.organization.update({
      where: { id: parsed.organizationId },
      data: { introductionsEnabled: parsed.introductionsEnabled },
      select: { introductionsEnabled: true },
    });
    return { introductionsEnabled: updated.introductionsEnabled };
  },
});

export type UpdateLeadStatusInput = {
  organizationId: string;
  leadId: string;
  status: string;
};

export const updateLeadStatusSchema = z
  .object({
    organizationId: z.string().min(1),
    leadId: z.string().min(1),
    status: z.string().min(1),
  })
  .strict();

export const updateLeadStatusAction = registerAction<
  UpdateLeadStatusInput,
  unknown
>({
  name: "crm.updateLeadStatus",
  description: "Update the status of an existing CRM lead.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = safeParse(updateLeadStatusSchema, input);
    const client = db(context);
    const lead = await client.lead.findUnique({ where: { id: parsed.leadId } });
    validateRecordBelongsToOrg(lead, parsed.organizationId, "LEAD");
    return client.lead.update({
      where: { id: parsed.leadId },
      data: { status: parsed.status as LeadStatus },
    });
  },
});

export const privacyLegalHoldSchema = z
  .object({
    organizationId: z.string().min(1),
    legalHold: z.boolean(),
  })
  .strict();

export const privacyLegalHoldAction = registerAction<
  z.infer<typeof privacyLegalHoldSchema>,
  { legalHold: boolean }
>({
  name: "privacy.legalHold",
  description:
    "Toggle legal hold on a tenant. Prevents PII anonymization while active.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(privacyLegalHoldSchema, input);
    const client = db(context);
    const updated = await client.organization.update({
      where: { id: parsed.organizationId },
      data: { legalHold: parsed.legalHold },
      select: { legalHold: true },
    });
    return { legalHold: updated.legalHold };
  },
});

export const anonymizePiiSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const createLeadSchema = z
  .object({
    organizationId: z.string().min(1),
    source: z.string().min(1).max(256),
    name: z.string().max(256).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(256).optional(),
    need: z.string().max(4096).optional(),
    aiSummary: z.string().max(4096).optional(),
    nextAction: z.string().max(256).optional(),
  })
  .strict();

export const createFollowUpTaskSchema = z
  .object({
    organizationId: z.string().min(1),
    leadId: z.string().min(1).optional(),
    assigneeId: z.string().min(1).optional(),
    title: z.string().min(1).max(512),
    description: z.string().max(4096).optional(),
    dueAt: z.string().max(64).optional(),
  })
  .strict();

export const createCompanySchema = z
  .object({
    organizationId: z.string().min(1),
    name: z.string().min(1).max(256),
    country: z.string().max(128).optional(),
    industry: z.string().max(128).optional(),
    type: z.enum([
      "BUYER",
      "SELLER",
      "PARTNER",
      "LOGISTICS",
      "SERVICE",
      "OTHER",
    ]),
    website: z.string().url().max(512).optional(),
    notes: z.string().max(4096).optional(),
  })
  .strict();

export const updateCompanySchema = z
  .object({
    organizationId: z.string().min(1),
    companyId: z.string().min(1),
    name: z.string().max(256).optional(),
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
    organizationId: z.string().min(1),
    companyId: z.string().min(1).optional(),
    name: z.string().max(256).optional(),
    email: z.string().email().max(256).optional(),
    phone: z.string().max(32).optional(),
    title: z.string().max(256).optional(),
    country: z.string().max(128).optional(),
  })
  .strict();

export const updateContactSchema = z
  .object({
    organizationId: z.string().min(1),
    contactId: z.string().min(1),
    companyId: z.string().min(1).optional(),
    name: z.string().max(256).optional(),
    email: z.string().email().max(256).optional(),
    phone: z.string().max(32).optional(),
    title: z.string().max(256).optional(),
    country: z.string().max(128).optional(),
  })
  .strict();

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const inviteUserSchema = z
  .object({
    organizationId: z.string().min(1),
    email: z.string().email().max(256),
    roleId: z.string().max(64).nullable().optional(),
  })
  .strict();

export const draftNotificationSchema = z
  .object({
    organizationId: z.string().min(1),
    title: z.string().min(1).max(256),
    body: z.string().min(1).max(8192),
    audience: z.string().max(64).optional(),
  })
  .strict();

export const sendBulkNotificationSchema = z
  .object({
    organizationId: z.string().min(1),
    title: z.string().min(1).max(256),
    body: z.string().min(1).max(8192),
    audience: z.string().max(64).optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    organizationId: z.string().min(1),
    avgDealValue: z.number().min(0).optional(),
    conversionRate: z.number().min(0).max(1).optional(),
  })
  .strict();

export const updateBillingPlanSchema = z
  .object({
    organizationId: z.string().min(1),
    plan: z.enum(["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"]),
  })
  .strict();

export const updateAiBudgetSchema = z
  .object({
    organizationId: z.string().min(1),
    aiMonthlyBudget: z.number().min(0),
  })
  .strict();

export const updateSecuritySchema = z
  .object({
    organizationId: z.string().min(1),
    mfaRequired: z.boolean(),
  })
  .strict();

export const updateIntroductionsSchema = z
  .object({
    organizationId: z.string().min(1),
    introductionsEnabled: z.boolean(),
  })
  .strict();

export const trackAiUsageSchema = z
  .object({
    organizationId: z.string().min(1),
    feature: z.string().min(1).max(256),
    provider: z.string().min(1).max(256),
    model: z.string().min(1).max(256),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    estimatedCost: z.number().nonnegative(),
  })
  .strict();

export const getAiBudgetSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const userRoleUpdateSchema = z
  .object({
    userId: z.string().min(1),
    roleId: z.string().min(1),
    organizationId: z.string().min(1),
  })
  .strict();

export function registerCrmActions() {
  return [
    createLeadAction,
    createFollowUpTaskAction,
    createCompanyAction,
    updateCompanyAction,
    createContactAction,
    updateContactAction,
    inviteUserAction,
    draftNotificationAction,
    sendBulkNotificationAction,
    updateProfileAction,
    updateBillingPlanAction,
    updateAiBudgetAction,
    updateSecurityAction,
    updateIntroductionsAction,
    updateLeadStatusAction,
    privacyLegalHoldAction,
    userRoleUpdateAction,
    trackAiUsageAction,
    getAiBudgetAction,
    anonymizePiiAction,
  ];
}

export const userRoleUpdateAction = registerAction<
  z.infer<typeof userRoleUpdateSchema>,
  { updated: boolean }
>({
  name: "user.roleUpdate",
  description: "Update a user's role within the organization.",
  riskLevel: "HIGH",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(userRoleUpdateSchema, input);
    const client = db(context);
    const role = await client.role.findUnique({ where: { id: parsed.roleId } });
    if (!role) throw new Error("ROLE_NOT_FOUND");
    if (!role.isSystem && role.organizationId !== context.organizationId) {
      throw new Error("INVALID_ROLE");
    }
    const membership = await client.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: parsed.userId,
          organizationId: parsed.organizationId,
        },
      },
    });
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("USER_NOT_ACTIVE_IN_ORGANIZATION");
    }
    await client.organizationMember.update({
      where: {
        userId_organizationId: {
          userId: parsed.userId,
          organizationId: parsed.organizationId,
        },
      },
      data: { roleId: parsed.roleId },
    });
    return { updated: true };
  },
});

export const anonymizePiiAction = registerAction<
  { organizationId: string },
  {
    anonymizedUsers: number;
    anonymizedContacts: number;
    anonymizedLeads: number;
    anonymizedRecords: number;
  }
>({
  name: "privacy.anonymizePii",
  description:
    "Anonymize all PII (names, emails, phones) for a tenant. Preserves audit trail and operational records.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input, context) => {
    const parsed = safeParse(anonymizePiiSchema, input);
    const client = db(context);
    const org = await client.organization.findUnique({
      where: { id: parsed.organizationId },
      select: { legalHold: true },
    });
    if (!org) throw new Error("ORGANIZATION_NOT_FOUND");
    if (org.legalHold) throw new Error("LEGAL_HOLD_ACTIVE");

    const [tenantUsers, memberUserIds] = await Promise.all([
      client.user.findMany({
        where: { organizationId: parsed.organizationId },
        select: { id: true },
      }),
      client.organizationMember.findMany({
        where: { organizationId: parsed.organizationId, status: "ACTIVE" },
        select: { userId: true },
      }),
    ]);
    const candidateIds = [
      ...new Set([
        ...tenantUsers.map((u) => u.id),
        ...memberUserIds.map((m) => m.userId),
      ]),
    ];

    const memberships = await client.organizationMember.findMany({
      where: { userId: { in: candidateIds }, status: "ACTIVE" },
      select: { userId: true, organizationId: true },
    });
    const orgCounts = new Map<string, number>();
    for (const m of memberships) {
      orgCounts.set(m.userId, (orgCounts.get(m.userId) ?? 0) + 1);
    }
    const exclusiveUserIds = candidateIds.filter(
      (id) => (orgCounts.get(id) ?? 1) === 1,
    );
    const sharedUserIds = candidateIds.filter(
      (id) => (orgCounts.get(id) ?? 1) > 1,
    );

    const [
      contacts,
      leads,
      companies,
      conversations,
      messages,
      tasks,
      quotations,
      approvals,
      webhooks,
      buyerIntroductions,
      sellerIntroductions,
      proposerIntroductions,
    ] = await Promise.all([
      client.contact.updateMany({
        where: { organizationId: parsed.organizationId },
        data: {
          name: null,
          email: null,
          phone: null,
          metadata: Prisma.JsonNull,
        },
      }),
      client.lead.updateMany({
        where: { organizationId: parsed.organizationId },
        data: {
          name: null,
          phone: null,
          email: null,
          aiSummary: null,
          need: "[ANONYMIZED]",
          metadata: Prisma.JsonNull,
        },
      }),
      client.company.updateMany({
        where: { organizationId: parsed.organizationId },
        data: { notes: null, metadata: Prisma.JsonNull },
      }),
      client.conversation.updateMany({
        where: { organizationId: parsed.organizationId },
        data: { aiSummary: null, metadata: Prisma.JsonNull },
      }),
      client.message.updateMany({
        where: { conversation: { organizationId: parsed.organizationId } },
        data: { content: "[ANONYMIZED]", metadata: Prisma.JsonNull },
      }),
      client.task.updateMany({
        where: { organizationId: parsed.organizationId },
        data: { description: null, metadata: Prisma.JsonNull },
      }),
      client.quotation.updateMany({
        where: { organizationId: parsed.organizationId },
        data: { content: "[ANONYMIZED]", metadata: Prisma.JsonNull },
      }),
      client.approvalRequest.updateMany({
        where: { organizationId: parsed.organizationId },
        data: { input: { anonymized: true }, result: Prisma.JsonNull },
      }),
      client.webhookEvent.updateMany({
        where: { organizationId: parsed.organizationId },
        data: {
          payload: Prisma.JsonNull,
          result: Prisma.JsonNull,
          error: null,
        },
      }),
      client.introductionRequest.updateMany({
        where: { buyerOrgId: parsed.organizationId },
        data: { buyerNote: null, buyerContactId: null },
      }),
      client.introductionRequest.updateMany({
        where: { sellerOrgId: parsed.organizationId },
        data: { sellerNote: null, sellerContactId: null },
      }),
      client.introductionRequest.updateMany({
        where: { proposerOrgId: parsed.organizationId },
        data: { buyerNote: null, sellerNote: null, disputeReason: null },
      }),
      ...exclusiveUserIds.map((id) =>
        client.user.update({
          where: { id },
          data: {
            name: "[ANONYMIZED]",
            email: `deleted-${id.slice(0, 8)}@anonymized.local`,
          },
        }),
      ),
      ...sharedUserIds.map((id) =>
        client.user.update({
          where: { id },
          data: { name: "[ANONYMIZED]" },
        }),
      ),
    ]);

    return {
      anonymizedUsers: candidateIds.length,
      anonymizedContacts: contacts.count,
      anonymizedLeads: leads.count,
      anonymizedRecords:
        contacts.count +
        leads.count +
        companies.count +
        conversations.count +
        messages.count +
        tasks.count +
        quotations.count +
        approvals.count +
        webhooks.count +
        buyerIntroductions.count +
        sellerIntroductions.count +
        proposerIntroductions.count,
    };
  },
});

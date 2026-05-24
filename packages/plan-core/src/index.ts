import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  registerAction,
} from "@tradeos/policy-core";
import { z } from "zod";

export type FeatureKey =
  | "seats"
  | "inbound_messages"
  | "ai_monthly_budget"
  | "integrations"
  | "sourcing_runs"
  | "checkpoints";

export const FEATURE_LIMITS: Record<string, Record<FeatureKey, number | null>> = {
  FREE: {
    seats: 2,
    inbound_messages: 100,
    ai_monthly_budget: 0,
    integrations: 1,
    sourcing_runs: 3,
    checkpoints: 3,
  },
  PILOT: {
    seats: 5,
    inbound_messages: 500,
    ai_monthly_budget: 50,
    integrations: 2,
    sourcing_runs: 10,
    checkpoints: 10,
  },
  TEAM: {
    seats: 20,
    inbound_messages: 2000,
    ai_monthly_budget: 200,
    integrations: 5,
    sourcing_runs: 50,
    checkpoints: 50,
  },
  ASSOCIATION: {
    seats: 100,
    inbound_messages: 10000,
    ai_monthly_budget: 1000,
    integrations: 10,
    sourcing_runs: 200,
    checkpoints: 200,
  },
  ENTERPRISE: {
    seats: null,
    inbound_messages: null,
    ai_monthly_budget: null,
    integrations: null,
    sourcing_runs: null,
    checkpoints: null,
  },
};

export async function checkEntitlement(
  organizationId: string,
  feature: FeatureKey,
): Promise<{ allowed: boolean; limit: number | null; current: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  if (!org) throw new Error("ORGANIZATION_NOT_FOUND");

  const planKey = org.plan as string;
  const limit =
    FEATURE_LIMITS[planKey]?.[feature] ?? FEATURE_LIMITS.FREE[feature];

  if (limit === null) return { allowed: true, limit: null, current: 0 };

  let current: number;
  switch (feature) {
    case "seats":
      current = await prisma.organizationMember.count({
        where: { organizationId, status: "ACTIVE" },
      });
      break;
    case "inbound_messages":
      current = await prisma.conversation.count({
        where: { organizationId },
      });
      break;
    case "ai_monthly_budget":
      current = (await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { aiMonthlyBudget: true },
      }))?.aiMonthlyBudget?.toNumber() ?? 0;
      break;
    case "integrations":
      current = await prisma.webhookIntegration.count({
        where: { organizationId },
      });
      break;
    case "sourcing_runs":
      current = await prisma.sourcingRun.count({
        where: { organizationId },
      });
      break;
    case "checkpoints":
      current = await prisma.workCheckpoint.count({
        where: { organizationId },
      });
      break;
    default:
      current = 0;
  }

  return { allowed: current < limit, limit, current };
}

export const checkEntitlementSchema = z
  .object({
    organizationId: z.string().min(1),
    feature: z.enum([
      "seats",
      "inbound_messages",
      "ai_monthly_budget",
      "integrations",
      "sourcing_runs",
      "checkpoints",
    ]),
  })
  .strict();

export const checkEntitlementAction = registerAction<
  z.infer<typeof checkEntitlementSchema>,
  { allowed: boolean; limit: number | null; current: number }
>({
  name: "plan.checkEntitlement",
  description:
    "Check if an organization has reached its plan limit for a given feature.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    return checkEntitlement(input.organizationId, input.feature);
  },
});

export const getPlanSchema = z
  .object({
    organizationId: z.string().min(1),
  })
  .strict();

export const getPlanAction = registerAction<
  z.infer<typeof getPlanSchema>,
  { plan: string; limits: Record<string, number | null> }
>({
  name: "plan.getPlan",
  description: "Get the current plan and feature limits for an organization.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input) => {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { plan: true },
    });
    if (!org) throw new Error("ORGANIZATION_NOT_FOUND");

    const planKey = org.plan as string;
    const limits = FEATURE_LIMITS[planKey] ?? FEATURE_LIMITS.FREE;

    return {
      plan: org.plan,
      limits: Object.fromEntries(
        Object.entries(limits).map(([k, v]) => [k, v ?? null]),
      ),
    };
  },
});

export const updatePlanSchema = z
  .object({
    organizationId: z.string().min(1),
    plan: z.enum(["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"]),
  })
  .strict();

export const updatePlanAction = registerAction<
  z.infer<typeof updatePlanSchema>,
  { plan: string }
>({
  name: "plan.updatePlan",
  description:
    "Update the plan for an organization. Only OWNER can execute.",
  riskLevel: "HIGH",
  allowedRoles: ["OWNER"],
  requiresApprovalForAI: true,
  handler: async (input) => {
    const updated = await prisma.organization.update({
      where: { id: input.organizationId },
      data: { plan: input.plan },
      select: { plan: true },
    });
    return { plan: updated.plan };
  },
});
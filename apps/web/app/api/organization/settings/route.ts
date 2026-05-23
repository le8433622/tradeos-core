import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import {
  executeAction,
  assertPermission,
  type ActorRole,
} from "@tradeos/policy-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";
import { updateOrganizationSettingsSchema } from "../../../../lib/validate";
import { z } from "zod";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
import "@tradeos/crm-core";

const VALID_PLANS = [
  "FREE",
  "PILOT",
  "TEAM",
  "ASSOCIATION",
  "ENTERPRISE",
] as const;

function makeContext(session: {
  userId: string;
  organizationId: string;
  role: string;
  mfaLevel?: string;
}) {
  return {
    actorUserId: session.userId,
    organizationId: session.organizationId,
    role: session.role as ActorRole,
    source: "manual" as const,
    mfaLevel: session.mfaLevel,
  };
}

function toNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function toBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  return val === true || val === "true";
}

export async function GET(request: Request) {
  const auth = await withApiPermission(request, "organization.settings.read");
  if (auth.response) return auth.response;
  const { session } = auth;

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: {
      id: true,
      name: true,
      plan: true,
      avgDealValue: true,
      conversionRate: true,
      aiMonthlyBudget: true,
      introductionsEnabled: true,
      mfaRequired: true,
    },
  });

  if (!org) {
    return NextResponse.json(
      { error: "ORGANIZATION_NOT_FOUND" },
      { status: 404 },
    );
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - ONE_DAY_MS);

  const [missedInbound, aiMonthSpend] = await Promise.all([
    prisma.webhookEvent.count({
      where: {
        organizationId: session.organizationId,
        receivedAt: { gte: twentyFourHoursAgo },
      },
    }),
    (async () => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const rows = await prisma.aiUsageEvent.findMany({
        where: {
          organizationId: session.organizationId,
          createdAt: { gte: monthStart },
        },
        select: { estimatedCost: true },
      });
      return rows.reduce((sum, r) => sum + Number(r.estimatedCost), 0);
    })(),
  ]);

  return NextResponse.json({
    organizationId: org.id,
    name: org.name,
    plan: org.plan,
    avgDealValue: org.avgDealValue == null ? null : Number(org.avgDealValue),
    conversionRate: org.conversionRate ?? null,
    aiMonthlyBudget:
      org.aiMonthlyBudget == null ? null : Number(org.aiMonthlyBudget),
    missedInbound24h: missedInbound,
    aiMonthSpend,
    introductionsEnabled: org.introductionsEnabled,
    mfaRequired: org.mfaRequired,
  });
}

export async function PATCH(request: Request) {
  try {
    const auth = await withApiPermission(
      request,
      "organization.settings.write",
    );
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = updateOrganizationSettingsSchema.parse(
        await request.json(),
      ) as unknown as Record<string, unknown>;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            error: "VALIDATION_ERROR",
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // Phase 1: parse and validate all inputs (dry-run, no mutations yet)
    const plan =
      typeof body.plan === "string"
        ? body.plan
        : body.plan === undefined
          ? undefined
          : null;
    const mfaRequired = toBool(body.mfaRequired);
    const aiMonthlyBudget = toNumber(body.aiMonthlyBudget);
    const avgDealValue = toNumber(body.avgDealValue);
    const conversionRate = toNumber(body.conversionRate);
    const introductionsEnabled = toBool(body.introductionsEnabled);

    const planField = plan !== undefined ? plan : null;
    const mfaField = mfaRequired !== undefined ? mfaRequired : null;
    const budgetField = aiMonthlyBudget !== undefined ? aiMonthlyBudget : null;
    const avgField = avgDealValue !== undefined ? avgDealValue : null;
    const convField = conversionRate !== undefined ? conversionRate : null;
    const introField =
      introductionsEnabled !== undefined ? introductionsEnabled : null;

    if (
      planField !== null &&
      !(VALID_PLANS as readonly string[]).includes(planField)
    ) {
      return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
    }
    if (avgField !== null && (isNaN(avgField) || avgField < 0)) {
      return NextResponse.json(
        { error: "INVALID_AVG_DEAL_VALUE" },
        { status: 400 },
      );
    }
    if (
      convField !== null &&
      (isNaN(convField) || convField < 0 || convField > 1)
    ) {
      return NextResponse.json(
        { error: "INVALID_CONVERSION_RATE" },
        { status: 400 },
      );
    }
    if (budgetField !== null && (isNaN(budgetField) || budgetField < 0)) {
      return NextResponse.json({ error: "INVALID_AI_BUDGET" }, { status: 400 });
    }

    // Phase 2: assert all permissions before any mutation
    const permissions = session.permissions;
    if (planField !== null) assertPermission(permissions, "billing.manage");
    if (mfaField !== null) assertPermission(permissions, "settings.security");
    if (budgetField !== null) assertPermission(permissions, "ai.budgetManage");
    if (avgField !== null || convField !== null)
      assertPermission(permissions, "settings.profile");
    if (introField !== null)
      assertPermission(permissions, "introduction.manage");

    // Phase 3: execute all mutations
    const ctx = makeContext(session);

    if (planField !== null) {
      await executeAction(
        "billing.planUpdate",
        {
          organizationId: session.organizationId,
          plan: planField,
        },
        ctx,
      );
    }

    if (mfaField !== null) {
      await executeAction(
        "settings.security",
        {
          organizationId: session.organizationId,
          mfaRequired: mfaField,
        },
        ctx,
      );
    }

    if (budgetField !== null) {
      await executeAction(
        "ai.budgetUpdate",
        {
          organizationId: session.organizationId,
          aiMonthlyBudget: budgetField,
        },
        ctx,
      );
    }

    if (avgField !== null || convField !== null) {
      await executeAction(
        "organization.settings.profile",
        {
          organizationId: session.organizationId,
          ...(avgField !== null ? { avgDealValue: avgField } : {}),
          ...(convField !== null ? { conversionRate: convField } : {}),
        },
        ctx,
      );
    }

    if (introField !== null) {
      await executeAction(
        "organization.settings.introductions",
        {
          organizationId: session.organizationId,
          introductionsEnabled: introField,
        },
        ctx,
      );
    }

    // Phase 4: return current state
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        id: true,
        name: true,
        plan: true,
        avgDealValue: true,
        conversionRate: true,
        aiMonthlyBudget: true,
        introductionsEnabled: true,
        mfaRequired: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "ORGANIZATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - ONE_DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [missedInbound, aiMonthSpend] = await Promise.all([
      prisma.webhookEvent.count({
        where: {
          organizationId: session.organizationId,
          receivedAt: { gte: twentyFourHoursAgo },
        },
      }),
      prisma.aiUsageEvent
        .findMany({
          where: {
            organizationId: session.organizationId,
            createdAt: { gte: monthStart },
          },
          select: { estimatedCost: true },
        })
        .then((rows) =>
          rows.reduce((sum, r) => sum + Number(r.estimatedCost), 0),
        ),
    ]);

    return NextResponse.json({
      organizationId: org.id,
      name: org.name,
      plan: org.plan,
      avgDealValue: org.avgDealValue == null ? null : Number(org.avgDealValue),
      conversionRate: org.conversionRate ?? null,
      aiMonthlyBudget:
        org.aiMonthlyBudget == null ? null : Number(org.aiMonthlyBudget),
      missedInbound24h: missedInbound,
      aiMonthSpend,
      introductionsEnabled: org.introductionsEnabled,
      mfaRequired: org.mfaRequired,
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

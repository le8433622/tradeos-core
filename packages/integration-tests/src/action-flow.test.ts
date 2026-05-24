import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@tradeos/database";
import { executeAction, type ActionContext } from "@tradeos/policy-core";
import "@tradeos/crm-core";
import "@tradeos/trade-core";

const runIntegration =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

const suffix = `it-${Date.now()}-${Math.random().toString(16).slice(2)}`;
let orgA: { id: string };
let orgB: { id: string };
let user: { id: string };

describeIntegration("database-backed action integration", () => {
  beforeAll(async () => {
    orgA = await prisma.organization.create({
      data: { name: `Integration Org A ${suffix}` },
      select: { id: true },
    });
    orgB = await prisma.organization.create({
      data: { name: `Integration Org B ${suffix}` },
      select: { id: true },
    });
    user = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        email: `${suffix}@tradeos.local`,
        role: "OWNER",
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    if (!runIntegration) return;
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA?.id, orgB?.id].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  function context(overrides: Partial<ActionContext> = {}): ActionContext {
    return {
      actorUserId: user.id,
      organizationId: orgA.id,
      role: "OWNER",
      source: "manual",
      mfaLevel: "aal2",
      ...overrides,
    };
  }

  it("executes a registered action and writes an audit log atomically", async () => {
    const result = await executeAction(
      "crm.createLead",
      {
        organizationId: orgA.id,
        source: "integration-test",
        name: "Integration Buyer",
      },
      context(),
    );

    const leadId = (result as { id: string }).id;
    const audit = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgA.id,
        actionName: "crm.createLead",
        result: { path: ["id"], equals: leadId },
      },
    });

    expect(leadId).toBeTruthy();
    expect(audit).toBeTruthy();
  });

  it("blocks cross-org record updates through action handlers", async () => {
    const foreignLead = await prisma.lead.create({
      data: {
        organizationId: orgB.id,
        source: "integration-test",
        name: "Foreign Lead",
      },
      select: { id: true },
    });

    await expect(
      executeAction(
        "crm.updateLeadStatus",
        {
          organizationId: orgA.id,
          leadId: foreignLead.id,
          status: "QUALIFIED",
        },
        context(),
      ),
    ).rejects.toThrow("LEAD_BELONGS_TO_ANOTHER_ORGANIZATION");
  });

  it("audits MFA blocks with structured blockReason", async () => {
    await expect(
      executeAction(
        "settings.security",
        {
          organizationId: orgA.id,
          mfaRequired: true,
        },
        context({ mfaLevel: "aal1" }),
      ),
    ).rejects.toThrow("MFA_REQUIRED");

    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: orgA.id, actionName: "settings.security" },
      orderBy: { createdAt: "desc" },
    });

    expect(audit?.approved).toBe(false);
    expect(audit?.result).toMatchObject({
      blocked: true,
      reason: "MFA_REQUIRED",
      blockReason: "mfa_required",
    });
  });

  it("verifies Deal.organizationId exists and is non-nullable after migrations", async () => {
    const rows = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Deal' AND column_name = 'organizationId'
    `;

    expect(rows[0]?.is_nullable).toBe("NO");
  });

  it("settings PATCH updates budget via budget.update (T1.002)", async () => {
    const result = await executeAction(
      "budget.update",
      { organizationId: orgA.id, aiMonthlyBudget: 150 },
      context(),
    );
    expect(result).toMatchObject({ aiMonthlyBudget: 150 });
  });

  it("settings PATCH updates profile via organization.settings.updateProfile (T1.002)", async () => {
    const result = await executeAction(
      "organization.settings.updateProfile",
      { organizationId: orgA.id, avgDealValue: 5000, conversionRate: 0.15 },
      context(),
    );
    expect(result).toMatchObject({ avgDealValue: 5000, conversionRate: 0.15 });
  });

  it("settings PATCH updates plan via billing.planUpdate as OWNER (T1.002)", async () => {
    const result = await executeAction(
      "billing.planUpdate",
      { organizationId: orgA.id, plan: "TEAM" },
      context(),
    );
    expect(result).toMatchObject({ plan: "TEAM" });
  });

  it("settings PATCH rejects invalid conversion rate (T1.002)", async () => {
    await expect(
      executeAction(
        "organization.settings.updateProfile",
        { organizationId: orgA.id, conversionRate: 5 },
        context(),
      ),
    ).rejects.toThrow();
  });

  it("quotation with line items persists items and computes totalAmount (T1.003)", async () => {
    const result = (await executeAction(
      "trade.draftQuotation",
      {
        organizationId: orgA.id,
        title: "Integration Test Quotation",
        requirements: "Test requirements",
        currency: "USD",
        items: [
          {
            description: "Item A",
            quantity: 2,
            unit: "pcs",
            unitPrice: 100,
          },
          {
            description: "Item B",
            quantity: 3,
            unit: "pcs",
            unitPrice: 50,
          },
        ],
      },
      context(),
    )) as { id: string; lineItems: unknown[]; totalAmount: number };

    expect(result.id).toBeTruthy();
    expect(result.lineItems).toHaveLength(2);
    // totalAmount = 2*100 + 3*50 = 200 + 150 = 350
    expect(Number(result.totalAmount)).toBe(350);
  });

  it("quotation rejects non-finite quantity via schema validation (T1.003)", async () => {
    // Infinity passes schema min/positive checks but is caught by handler's isFinite check
    await expect(
      executeAction(
        "trade.draftQuotation",
        {
          organizationId: orgA.id,
          title: "Bad Quantity Quotation",
          requirements: "Test",
          items: [
            {
              description: "Bad Item",
              quantity: Infinity,
              unit: "pcs",
              unitPrice: 100,
            },
          ],
        },
        context(),
      ),
    ).rejects.toThrow("INVALID_QUOTATION_ITEM_QUANTITY");
  });
});

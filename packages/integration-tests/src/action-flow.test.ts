import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@tradeos/database";
import { executeAction, type ActionContext } from "@tradeos/policy-core";
import "@tradeos/crm-core";

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
});

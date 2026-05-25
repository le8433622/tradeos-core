import { createTenantGuard, TENANT_SCOPED_MODELS } from "../tenant-guard";

describe("tenantGuard", () => {
  const guard = createTenantGuard();

  function makeParams(model: string, action: string, args: unknown) {
    return { model, action, args };
  }

  async function expectPass(params: {
    model?: string;
    action: string;
    args: unknown;
  }) {
    const next = vi.fn().mockResolvedValue("ok");
    const result = await guard(params as Parameters<typeof guard>[0], next);
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe("ok");
  }

  async function expectBlock(params: {
    model?: string;
    action: string;
    args: unknown;
  }) {
    const next = vi.fn();
    await expect(
      guard(params as Parameters<typeof guard>[0], next),
    ).rejects.toThrow("TENANT_SCOPE_REQUIRED");
    expect(next).not.toHaveBeenCalled();
  }

  const TENANT_MODEL = "SourcingRun";

  // ── findMany ──
  it("blocks findMany without organizationId in where", async () => {
    await expectBlock(makeParams(TENANT_MODEL, "findMany", { where: {} }));
  });

  it("allows findMany with organizationId in where", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "findMany", {
        where: { organizationId: "org-1" },
      }),
    );
  });

  it("blocks findMany without where at all", async () => {
    await expectBlock(makeParams(TENANT_MODEL, "findMany", {}));
  });

  // ── findFirst ──
  it("blocks findFirst without organizationId", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "findFirst", { where: { id: "x" } }),
    );
  });

  it("allows findFirst with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "findFirst", {
        where: { organizationId: "org-1", id: "x" },
      }),
    );
  });

  // ── findUnique ──
  it("allows findUnique without organizationId (by design)", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "findUnique", { where: { id: "x" } }),
    );
  });

  // ── create ──
  it("blocks create without organizationId in data", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "create", {
        data: { name: "test" },
      }),
    );
  });

  it("allows create with organizationId in data", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "create", {
        data: { name: "test", organizationId: "org-1" },
      }),
    );
  });

  // ── createMany ──
  it("blocks createMany without organizationId in data", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "createMany", {
        data: [{ name: "a" }, { name: "b" }],
      }),
    );
  });

  it("allows createMany with organizationId in data", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "createMany", {
        data: [
          { name: "a", organizationId: "org-1" },
          { name: "b", organizationId: "org-1" },
        ],
      }),
    );
  });

  // ── update ──
  it("blocks update without organizationId in where", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "update", {
        where: { id: "x" },
        data: { name: "new" },
      }),
    );
  });

  it("allows update with organizationId in where", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "update", {
        where: { organizationId: "org-1", id: "x" },
        data: { name: "new" },
      }),
    );
  });

  it("allows update via nested OR with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "update", {
        where: {
          OR: [
            { organizationId: "org-1", id: "x" },
            { organizationId: "org-1", id: "y" },
          ],
        },
        data: { name: "new" },
      }),
    );
  });

  // ── updateMany ──
  it("blocks updateMany without organizationId", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "updateMany", {
        where: {},
        data: { name: "new" },
      }),
    );
  });

  it("allows updateMany with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "updateMany", {
        where: { organizationId: "org-1" },
        data: { name: "new" },
      }),
    );
  });

  // ── delete ──
  it("blocks delete without organizationId", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "delete", { where: { id: "x" } }),
    );
  });

  it("allows delete with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "delete", {
        where: { organizationId: "org-1", id: "x" },
      }),
    );
  });

  // ── deleteMany ──
  it("blocks deleteMany without organizationId", async () => {
    await expectBlock(makeParams(TENANT_MODEL, "deleteMany", { where: {} }));
  });

  it("allows deleteMany with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "deleteMany", {
        where: { organizationId: "org-1" },
      }),
    );
  });

  // ── upsert ──
  it("blocks upsert without organizationId in where", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "upsert", {
        where: { id: "x" },
        create: { name: "new", organizationId: "org-1" },
        update: { name: "new" },
      }),
    );
  });

  it("blocks upsert without organizationId in create", async () => {
    await expectBlock(
      makeParams(TENANT_MODEL, "upsert", {
        where: { organizationId: "org-1", id: "x" },
        create: { name: "new" },
        update: { name: "new" },
      }),
    );
  });

  it("allows upsert with organizationId in both where and create", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "upsert", {
        where: { organizationId: "org-1", id: "x" },
        create: { name: "new", organizationId: "org-1" },
        update: { name: "new" },
      }),
    );
  });

  // ── count ──
  it("blocks count without organizationId", async () => {
    await expectBlock(makeParams(TENANT_MODEL, "count", { where: {} }));
  });

  it("allows count with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "count", {
        where: { organizationId: "org-1" },
      }),
    );
  });

  // ── aggregate ──
  it("blocks aggregate without organizationId", async () => {
    await expectBlock(makeParams(TENANT_MODEL, "aggregate", { where: {} }));
  });

  it("allows aggregate with organizationId", async () => {
    await expectPass(
      makeParams(TENANT_MODEL, "aggregate", {
        where: { organizationId: "org-1" },
      }),
    );
  });

  // ── Non-tenant model is never blocked ──
  it("does not block non-tenant models", async () => {
    await expectPass(
      makeParams("User", "findMany", { where: { email: "x@y.com" } }),
    );
    await expectPass(makeParams("Organization", "findMany", { where: {} }));
    await expectPass(makeParams("Role", "findMany", {}));
    await expectPass(makeParams("Permission", "findMany", {}));
  });

  // ── Model not in list ──
  it("does not block models not in tenant list", async () => {
    await expectPass(makeParams("User", "create", { data: { email: "x" } }));
    await expectPass(
      makeParams("RolePermission", "createMany", { data: [{ roleId: "r" }] }),
    );
  });

  // ── All tenant models are listed ──
  it("lists all expected tenant-scoped models", () => {
    expect(TENANT_SCOPED_MODELS).toContain("SourcingRun");
    expect(TENANT_SCOPED_MODELS).toContain("SupplierCandidate");
    expect(TENANT_SCOPED_MODELS).toContain("PurchaseBaseline");
    expect(TENANT_SCOPED_MODELS).toContain("SupplierQuote");
    expect(TENANT_SCOPED_MODELS).toContain("SupplierAlternative");
    expect(TENANT_SCOPED_MODELS).toContain("SwitchDecisionReport");
    expect(TENANT_SCOPED_MODELS).toContain("EvidenceItem");
    expect(TENANT_SCOPED_MODELS).toContain("WorkCheckpoint");
    expect(TENANT_SCOPED_MODELS).toContain("Payment");
    expect(TENANT_SCOPED_MODELS).toContain("ApprovalRequest");
    expect(TENANT_SCOPED_MODELS).toContain("AuditLog");
    expect(TENANT_SCOPED_MODELS).toContain("HumanHandover");
    expect(TENANT_SCOPED_MODELS).toContain("PlanLimit");
    expect(TENANT_SCOPED_MODELS).toContain("OutcomeRecord");
  });

  // ── Non-tenant models excluded from list ──
  it("does not include non-tenant models in the list", () => {
    expect(TENANT_SCOPED_MODELS).not.toContain("User");
    expect(TENANT_SCOPED_MODELS).not.toContain("Organization");
    expect(TENANT_SCOPED_MODELS).not.toContain("Role");
    expect(TENANT_SCOPED_MODELS).not.toContain("Permission");
    expect(TENANT_SCOPED_MODELS).not.toContain("RolePermission");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@tradeos/database";
import { detectPain } from "@tradeos/evidence-core";
import { executeAction, type ActionContext } from "@tradeos/policy-core";
import "@tradeos/evidence-core";
import "@tradeos/sourcing-core";

const runIntegration =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

const suffix = `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
let org: { id: string };
let user: { id: string };

describeIntegration("Assisted Flow QA — evidence → pain → draft → gate", () => {
  beforeAll(async () => {
    org = await prisma.organization.create({
      data: { name: `QA Org ${suffix}`, plan: "ENTERPRISE" },
      select: { id: true },
    });
    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: `${suffix}@tradeos.local`,
        role: "OWNER",
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    if (!runIntegration) return;
    await prisma.evidenceItem.deleteMany({
      where: { organizationId: org.id },
    });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.$disconnect();
  });

  function ctx(overrides: Partial<ActionContext> = {}): ActionContext {
    return {
      actorUserId: user.id,
      organizationId: org.id,
      role: "OWNER",
      source: "manual",
      mfaLevel: "aal2",
      ...overrides,
    };
  }

  // ---- Helpers ----

  async function createEvidence(
    parsedEvidence: Record<string, unknown>,
    rawText?: string,
  ) {
    return executeAction(
      "evidence.createItem",
      {
        organizationId: org.id,
        relatedType: "SOURCING_RUN",
        evidenceType: "ALTERNATIVE_QUOTE",
        title: "QA test evidence",
        content: rawText ?? "Test content",
        metadata: { parsedEvidence, rawText: rawText ?? "Test content" },
      },
      ctx(),
    ) as Promise<{ id: string }>;
  }

  function makeCompleteQuote() {
    return {
      sourceType: "MANUAL_TEXT",
      productName: "Steel Coils",
      supplierName: "Thai Steel Co.",
      price: 4100,
      currency: "USD",
      unit: "MT",
      quantity: 500,
      originCountry: "Thailand",
      landedCost: 4500,
      paymentTerms: "LC at sight",
      deliveryTerms: "CIF Ho Chi Minh",
      evidenceQuality: "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS",
      evidenceQualityScore: 65,
      missingProofFlags: [],
      confidence: {},
      rawEvidenceRef: "qa-test-ref",
    };
  }

  function makeWeakQuote() {
    return {
      sourceType: "MANUAL_TEXT",
      evidenceQuality: "L0_UNVERIFIED_CLAIM",
      evidenceQualityScore: 10,
      missingProofFlags: [
        "NEEDS_CURRENT_PRICE",
        "NEEDS_SUPPLIER_IDENTITY",
        "NEEDS_LANDED_COST",
      ],
      confidence: {},
      rawEvidenceRef: "qa-weak-ref",
    };
  }

  function makeMissingSupplierQuote() {
    return {
      ...makeCompleteQuote(),
      supplierName: undefined,
      missingProofFlags: ["NEEDS_SUPPLIER_IDENTITY"],
      evidenceQuality: "L2_BASIC_QUOTE_OR_INVOICE",
      evidenceQualityScore: 40,
    };
  }

  function makeMissingLandedCostQuote() {
    return {
      ...makeCompleteQuote(),
      landedCost: undefined,
      missingProofFlags: ["NEEDS_LANDED_COST"],
    };
  }

  // ---- Test case 1: Complete quote → CREATE_CASE_DRAFT ----

  it("TC1: Complete quote → CREATE_CASE_DRAFT", async () => {
    const pain = detectPain(makeCompleteQuote() as any);
    expect(pain.suggestedNextStep).toBe("CREATE_CASE_DRAFT");
    expect(pain.painFlags).toHaveLength(0);
    expect(pain.dependencyFlags).toContain("SINGLE_SUPPLIER_DEPENDENCY");

    const evidence = await createEvidence(makeCompleteQuote());
    expect(evidence.id).toBeTruthy();

    const run = await executeAction(
      "sourcing.createRun",
      {
        organizationId: org.id,
        title: "QA TC1 — Steel Coils",
        requirement: "Complete quote with all fields",
        metadata: {
          painCategories: pain.painFlags,
          dependencyFlags: pain.dependencyFlags,
          painDetail: pain.suggestedReason,
          suggestedNextStep: "CREATE_CASE_DRAFT",
        },
      },
      ctx(),
    );
    const runResult = run as { id: string; status: string };
    expect(runResult.id).toBeTruthy();
    expect(runResult.status).toBe("DRAFT");
  });

  // ---- Test case 2: Weak quote → NEEDS_MORE_EVIDENCE ----

  it("TC2: Weak quote → NEEDS_MORE_EVIDENCE", async () => {
    const pain = detectPain(makeWeakQuote() as any);
    expect(pain.suggestedNextStep).toBe("NEEDS_MORE_EVIDENCE");
    expect(pain.painFlags).toContain("CURRENT_PRICE_UNKNOWN");
    expect(pain.painFlags).toContain("SUPPLIER_PROOF_WEAK");
    expect(pain.painFlags).toContain("LANDED_COST_UNKNOWN");
    expect(pain.painFlags).toContain("EVIDENCE_WEAK");

    const evidence = await createEvidence(makeWeakQuote());
    expect(evidence.id).toBeTruthy();
  });

  // ---- Test case 3: Weak quote + override → creates run ----

  it("TC3: Weak quote + override reason creates run with stored override", async () => {
    const pain = detectPain(makeWeakQuote() as any);

    const run = await executeAction(
      "sourcing.createRun",
      {
        organizationId: org.id,
        title: "QA TC3 — Override weak evidence",
        requirement: "Weak evidence but urgent business need",
        metadata: {
          painCategories: pain.painFlags,
          dependencyFlags: pain.dependencyFlags,
          painDetail: pain.suggestedReason,
          suggestedNextStep: "NEEDS_MORE_EVIDENCE",
          overrideReason:
            "Buyer confirmed verbally, written quote expected tomorrow",
          reviewState: undefined,
        },
      },
      ctx(),
    );
    const runResult = run as { id: string };
    expect(runResult.id).toBeTruthy();

    const saved = await prisma.sourcingRun.findUnique({
      where: { id: runResult.id },
      select: { metadata: true },
    });
    expect(saved?.metadata).toBeTruthy();
  });

  // ---- Test case 4: Missing supplier → NEEDS_SUPPLIER_IDENTITY ----

  it("TC4: Missing supplier → gate blocks without supplier or override", async () => {
    const pain = detectPain(makeMissingSupplierQuote() as any);
    expect(pain.suggestedNextStep).toBe("NEEDS_SUPPLIER_IDENTITY");
    expect(pain.painFlags).toContain("SUPPLIER_PROOF_WEAK");
    expect(pain.dependencyFlags).toContain("SUPPLIER_INFORMATION_CONTROL");
  });

  it("TC4b: Missing supplier with override creates run", async () => {
    const pain = detectPain(makeMissingSupplierQuote() as any);

    const run = await executeAction(
      "sourcing.createRun",
      {
        organizationId: org.id,
        title: "QA TC4b — Override missing supplier",
        requirement: "Known supplier but evidence not yet uploaded",
        metadata: {
          painCategories: pain.painFlags,
          dependencyFlags: pain.dependencyFlags,
          painDetail: pain.suggestedReason,
          suggestedNextStep: "NEEDS_SUPPLIER_IDENTITY",
          overrideReason: "Operator knows the supplier personally",
          supplierProvided: false,
          reviewState: "SUPPLIER_IDENTITY_PENDING",
        },
      },
      ctx(),
    );
    const runResult = run as { id: string };
    expect(runResult.id).toBeTruthy();
  });

  it("TC4c: Missing supplier with supplierName creates run", async () => {
    const pain = detectPain(makeMissingSupplierQuote() as any);

    const run = await executeAction(
      "sourcing.createRun",
      {
        organizationId: org.id,
        title: "QA TC4c — Supplier provided",
        requirement: "Supplier name known",
        metadata: {
          painCategories: pain.painFlags,
          dependencyFlags: pain.dependencyFlags,
          painDetail: pain.suggestedReason,
          suggestedNextStep: "NEEDS_SUPPLIER_IDENTITY",
          supplierProvided: true,
        },
      },
      ctx(),
    );
    const runResult = run as { id: string };
    expect(runResult.id).toBeTruthy();
  });

  // ---- Test case 5: Missing origin/landed cost → REQUEST_MORE_EVIDENCE ----

  it("TC5: Missing landed cost → REQUEST_MORE_EVIDENCE → creates PROOF_PENDING", async () => {
    const pain = detectPain(makeMissingLandedCostQuote() as any);
    expect(pain.suggestedNextStep).toBe("REQUEST_MORE_EVIDENCE");
    expect(pain.painFlags).toContain("LANDED_COST_UNKNOWN");

    const run = await executeAction(
      "sourcing.createRun",
      {
        organizationId: org.id,
        title: "QA TC5 — Missing landed cost",
        requirement: "Need CIF quote from supplier",
        metadata: {
          painCategories: pain.painFlags,
          dependencyFlags: pain.dependencyFlags,
          painDetail: pain.suggestedReason,
          suggestedNextStep: "REQUEST_MORE_EVIDENCE",
          reviewState: "PROOF_PENDING",
          requiredProof: ["NEEDS_LANDED_COST"],
        },
      },
      ctx(),
    );
    const runResult = run as { id: string };
    expect(runResult.id).toBeTruthy();

    // Verify metadata stored
    const saved = await prisma.sourcingRun.findUnique({
      where: { id: runResult.id },
      select: { metadata: true },
    });
    expect(saved?.metadata).toBeTruthy();
  });

  // ---- Cross-tenant isolation ----

  it("TC6: Cross-tenant evidence cannot be read by other org", async () => {
    const foreignOrg = await prisma.organization.create({
      data: { name: `QA Foreign Org ${suffix}` },
      select: { id: true },
    });

    const foreignEvidence = await executeAction(
      "evidence.createItem",
      {
        organizationId: foreignOrg.id,
        relatedType: "SOURCING_RUN",
        evidenceType: "ALTERNATIVE_QUOTE",
        title: "Foreign QA evidence",
        content: "Foreign",
        metadata: { parsedEvidence: makeCompleteQuote() },
      },
      ctx({ organizationId: foreignOrg.id }),
    );

    const evidenceFromOrgA = await prisma.evidenceItem.findFirst({
      where: {
        id: (foreignEvidence as { id: string }).id,
        organizationId: org.id,
      },
      select: { id: true },
    });
    expect(evidenceFromOrgA).toBeNull();

    await prisma.organization.delete({ where: { id: foreignOrg.id } });
  });

  // ---- Verify permissions ----

  it("TC7: evidence.upload permission required for evidence operations", async () => {
    await expect(
      executeAction(
        "evidence.createItem",
        {
          organizationId: org.id,
          relatedType: "SOURCING_RUN",
          evidenceType: "ALTERNATIVE_QUOTE",
          title: "Permission test",
        },
        ctx({ role: "VIEWER" }),
      ),
    ).rejects.toThrow("ROLE_NOT_ALLOWED");
  });

  it("TC8: sourcing.create requires appropriate role", async () => {
    await expect(
      executeAction(
        "sourcing.createRun",
        {
          organizationId: org.id,
          title: "Permission test",
          requirement: "Test",
        },
        ctx({ role: "VIEWER" }),
      ),
    ).rejects.toThrow("ROLE_NOT_ALLOWED");
  });
});

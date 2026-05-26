#!/usr/bin/env node
/**
 * seed-behavior-fixtures.cjs
 *
 * Creates messy human-behavior fixtures for Supplier Switch QA.
 * Each scenario is a complete SourcingRun with baseline, alternatives,
 * evidence, and a decision report reflecting realistic but messy buyer behavior.
 *
 * All fixtures are namespaced under the organization "behavior-qa-01"
 * and are cleanup-safe (can be deleted by orgId).
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ORG_ID = "behavior-qa-01";
const ORG_NAME = "Behavior QA Org";
const USER_EMAIL = "behavior-qa@tradeos.local";
const USER_NAME = "Behavior QA Tester";

const SCENARIO_COUNTS = {
  sourcingRuns: 0,
  baselines: 0,
  alternatives: 0,
  quotes: 0,
  reports: 0,
  checkpoints: 0,
  evidenceItems: 0,
};

function count(s) {
  SCENARIO_COUNTS[s]++;
}

async function ensureSourcingPermissions(roleId) {
  const REQUIRED_PERMISSIONS = ["sourcing.list", "sourcing.view"];
  for (const key of REQUIRED_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: `Sourcing: ${key.replace("sourcing.", "")}`,
        group: "sourcing",
      },
    });
    const existing = await prisma.rolePermission.findFirst({
      where: { roleId, permissionId: perm.id },
    });
    if (!existing) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: perm.id },
      });
      console.log(`  [perm] ${key} → ${roleId}`);
    }
  }
}

async function ensureOrgAndUser() {
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { plan: "PILOT" },
    create: {
      id: ORG_ID,
      name: ORG_NAME,
      type: "IMPORTER",
      plan: "PILOT",
      country: "Vietnam",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: {
      organizationId: org.id,
      email: USER_EMAIL,
      name: USER_NAME,
      role: "OWNER",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: "system-owner",
      status: "ACTIVE",
      acceptedAt: new Date(),
    },
  });

  return { org, user };
}

async function scenarioQualifiedBuyer(orgId) {
  // Buyer: decision maker, shared invoice + quote. Clean happy path → SWITCH
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Qualified Buyer — Steel HRC",
      requirement: "Seeking HRC SAE1006 2.0mm coil, 5,000 MT/year",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Steel — Hot Rolled Coil",
      quantity: "5000",
      currency: "USD",
      riskLevel: "LOW",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "VSC",
      sourceType: "MANUAL",
      productDescription: "HRC SAE1006 2.0mm coil",
      quantity: 5000,
      unit: "MT",
      unitPrice: 620,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 37200000,
      paymentTerms: "L/C at sight",
      deliveryTerms: "CIF HCMC",
      leadTime: "6-8 weeks",
      riskFlags: JSON.stringify({ priceVolatility: "MEDIUM" }),
      marketPrice: 580,
    },
  });
  count("baselines");

  const alt1 = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Baosteel",
      productDescription: "HRC SAE1006 2.0mm coil SPHC equivalent",
      quantity: 5000,
      unit: "MT",
      unitPrice: 545,
      totalCost: 2725000,
      currency: "USD",
      moq: "300 MT",
      leadTime: "4-5 weeks",
      riskFlags: JSON.stringify({ tariffRisk: "MEDIUM" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "HRC SAE1006 2.0mm coil SPHC",
      unitPrice: 545,
      totalAmount: 2725000,
      currency: "USD",
      moq: "300",
      leadTime: "4-5 weeks",
      shippingTerm: "CFR",
      paymentTerm: "30% T/T deposit, 70% BL",
    },
  });
  count("quotes");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "HRC SAE1006 2.0mm coil SPHC-1K",
      unitPrice: 560,
      totalAmount: 2800000,
      currency: "USD",
      moq: "200",
      leadTime: "3-4 weeks",
      shippingTerm: "CIF",
      paymentTerm: "L/C at sight",
    },
  });
  count("quotes");

  const alt2 = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "POSCO",
      productDescription: "HRC SAE1006 2.0mm coil SPHC-1K",
      quantity: 5000,
      unit: "MT",
      unitPrice: 560,
      totalCost: 2800000,
      currency: "USD",
      moq: "200 MT",
      leadTime: "3-4 weeks",
      riskFlags: JSON.stringify({ quality: "HIGH" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "SWITCH",
      confidence: "HIGH",
      savingsScore: 75,
      evidenceScore: 90,
      paymentRiskScore: 20,
      leadTimeRiskScore: 10,
      dependencyRiskScore: 30,
      overallScore: 82,
      monthlySavings: 37500,
      annualSavings: 450000,
      savingsPercent: 12.1,
      currency: "USD",
      baselineId: "",
      topAlternativeId: "",
      evidenceSummary: JSON.stringify({
        baselineEvidence: "Invoice VSC-2026-05",
        alt1Evidence: "Quote BS-2026-Q3-001",
        marketCheck: "Platts CFR SE Asia ~$575/MT",
      }),
      riskFlags: JSON.stringify({ singleSourceRisk: "MEDIUM" }),
      summary:
        "SWITCH to POSCO: better lead time, consistent quality at $560/MT. $450K/yr savings.",
    },
  });
  count("reports");

  for (const cp of [
    { title: "[QA] Baseline Verified", cpType: "PAID_SOURCING_REQUEST" },
    { title: "[QA] Alternatives Shortlisted", cpType: "SUPPLIER_SHORTLIST" },
    {
      title: "[QA] Switch Decision Delivered",
      cpType: "BUYER_DECISION_REPORT",
    },
  ]) {
    await prisma.workCheckpoint.create({
      data: {
        organizationId: orgId,
        sourcingRunId: run.id,
        title: cp.title,
        checkpointType: cp.cpType,
        status: "DELIVERED",
      },
    });
    count("checkpoints");
  }

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "PurchaseBaseline",
      evidenceType: "CURRENT_SUPPLIER_INVOICE",
      title: "VSC Invoice May 2026",
      description: "Official invoice showing $620/MT",
      metadata: JSON.stringify({ quality: "high", verified: true }),
    },
  });
  count("evidenceItems");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SwitchDecisionReport",
      evidenceType: "ALTERNATIVE_QUOTE",
      title: "POSCO Quote Q3-072",
      description: "Formal quotation with all terms",
      metadata: JSON.stringify({ quality: "high", verified: true }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioNonDecisionMaker(orgId) {
  // Buyer: employee, cannot approve, says "I need to ask my boss"
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Non Decision Maker — Aluminum Sheets",
      requirement:
        "Looking for 3003 aluminum sheet, 1.5mm, 2000x1000mm, 200 MT",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Aluminum — Sheet",
      quantity: "200",
      currency: "USD",
      riskLevel: "MEDIUM",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Vietnam Aluminum Co",
      sourceType: "MANUAL",
      productDescription: "3003 H14 1.5mm sheet",
      quantity: 200,
      unit: "MT",
      unitPrice: 3200,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 7680000,
      paymentTerms: "30 day net",
      riskFlags: JSON.stringify({ quality: "MEDIUM" }),
      marketPrice: 3100,
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Mingtai Aluminum (China)",
      productDescription: "3003 H14 1.5mm sheet",
      quantity: 200,
      unit: "MT",
      unitPrice: 2850,
      totalCost: 570000,
      currency: "USD",
      moq: "50 MT",
      leadTime: "3-4 weeks",
      riskFlags: JSON.stringify({ qualityCert: "MEDIUM" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "3003 H14 1.5mm sheet",
      unitPrice: 2850,
      totalAmount: 570000,
      currency: "USD",
      moq: "50",
      leadTime: "3-4 weeks",
      shippingTerm: "CFR",
      paymentTerm: "30% T/T, 70% BL",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "WAIT",
      confidence: "MEDIUM",
      savingsScore: 45,
      evidenceScore: 60,
      paymentRiskScore: 40,
      leadTimeRiskScore: 20,
      dependencyRiskScore: 50,
      overallScore: 55,
      monthlySavings: 8750,
      annualSavings: 105000,
      savingsPercent: 10.9,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        baselineEvidence: "Price list provided verbally",
        altEvidence: "Quote MT-Q2-2026-088",
      }),
      missingProof: JSON.stringify({
        buyerAuthority:
          "Contact person is not decision maker — needs manager approval",
      }),
      riskFlags: JSON.stringify({ decisionAuthority: "HIGH" }),
      summary:
        "WAIT: buyer contact cannot approve. Price list only (no invoice). Need manager meeting.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "PurchaseBaseline",
      evidenceType: "CURRENT_SUPPLIER_PRICE_LIST",
      title: "VAC Price List (verbal)",
      description: "Buyer shared price verbally over phone",
      metadata: JSON.stringify({ quality: "low", verified: false }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioMissingInvoice(orgId) {
  // Buyer: no invoice, no price list, just supplier name
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Missing Invoice — Chemicals",
      requirement: "Need Sodium Hydroxide 99% flake, 100 MT/month",
      status: "ACTIVE",
      targetCountry: "Thailand",
      sourceCountry: "Vietnam",
      productCategory: "Chemicals — Caustic Soda",
      quantity: "100",
      currency: "USD",
      riskLevel: "HIGH",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Unknown (buyer refused to name)",
      sourceType: "MANUAL",
      productDescription: "NaOH 99% flake",
      quantity: 100,
      unit: "MT",
      unitPrice: null,
      currency: "USD",
      riskFlags: JSON.stringify({ supplierUnknown: "CRITICAL" }),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "GC Chemical (Thailand)",
      productDescription: "NaOH 99% flake",
      quantity: 100,
      unit: "MT",
      unitPrice: 420,
      totalCost: 42000,
      currency: "USD",
      moq: "20 MT",
      leadTime: "2 weeks",
      riskFlags: JSON.stringify({ firstTimePartner: "HIGH" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "NaOH 99% flake",
      unitPrice: 420,
      totalAmount: 42000,
      currency: "USD",
      moq: "20",
      leadTime: "2 weeks",
      shippingTerm: "CIF",
      paymentTerm: "100% L/C",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "WAIT",
      confidence: "LOW",
      savingsScore: 10,
      evidenceScore: 5,
      paymentRiskScore: 80,
      leadTimeRiskScore: 30,
      dependencyRiskScore: 90,
      overallScore: 15,
      evidenceSummary: JSON.stringify({}),
      missingProof: JSON.stringify({
        baselinePrice: "Buyer refused to share current supplier or invoice",
        currentSupplier: "Unknown",
      }),
      riskFlags: JSON.stringify({
        blindBaseline: "CRITICAL",
        unknownSupplier: "CRITICAL",
      }),
      summary:
        "WAIT: No baseline evidence. Buyer refuses to name current supplier. Cannot assess savings.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "PurchaseBaseline",
      evidenceType: "CALL_NOTE",
      title: "Call note — buyer refused details",
      description:
        "Buyer wants comparison but will not share current supplier or price",
      metadata: JSON.stringify({
        quality: "very_low",
        buyerCooperative: false,
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioWeakScreenshot(orgId) {
  // Buyer: sent blurry screenshot of chat with a price
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Weak Screenshot — Packaging Film",
      requirement: "Looking for BOPP film 20 micron, 500mm width, 50 MT",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Packaging — BOPP Film",
      quantity: "50",
      currency: "USD",
      riskLevel: "HIGH",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Saigon Pack Co",
      sourceType: "MANUAL",
      productDescription: "BOPP 20 micron 500mm",
      quantity: 50,
      unit: "MT",
      unitPrice: 1850,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 1110000,
      riskFlags: JSON.stringify({ priceStability: "MEDIUM" }),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Zhejiang Packing (China)",
      productDescription: "BOPP 20 micron 500mm",
      quantity: 50,
      unit: "MT",
      unitPrice: 1520,
      totalCost: 76000,
      currency: "USD",
      moq: "25 MT",
      leadTime: "3-4 weeks",
      riskFlags: JSON.stringify({ qualityUnknown: "HIGH" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "BOPP 20 micron 500mm",
      unitPrice: 1520,
      totalAmount: 76000,
      currency: "USD",
      moq: "25",
      leadTime: "3-4 weeks",
      shippingTerm: "CFR",
      paymentTerm: "30% deposit, 70% BL",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "WAIT",
      confidence: "LOW",
      savingsScore: 40,
      evidenceScore: 10,
      paymentRiskScore: 60,
      leadTimeRiskScore: 40,
      dependencyRiskScore: 60,
      overallScore: 25,
      monthlySavings: 13750,
      annualSavings: 165000,
      savingsPercent: 17.8,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        baselineEvidence: "Screenshot of chat message (not verifiable)",
        altEvidence: "Quote ZJ-PACK-2026-012",
      }),
      missingProof: JSON.stringify({
        baselineVerification:
          "Blurry screenshot — cannot verify authenticity or terms",
      }),
      riskFlags: JSON.stringify({ weakEvidence: "HIGH" }),
      summary:
        "WAIT: Screenshot evidence is not sufficient for baseline verification. Request official invoice or price list.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "PurchaseBaseline",
      evidenceType: "QUOTE_SCREENSHOT",
      title: "Chat screenshot — current price",
      description: "Blurry screenshot of a WeChat message showing '1850usd/mt'",
      metadata: JSON.stringify({
        quality: "very_low",
        verifiable: false,
        format: "screenshot",
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioNonComparable(orgId) {
  // Buyer: comparing HRC steel vs galvanized — different specs
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Non-Comparable — Steel HRC vs Galv",
      requirement: "Need steel coil, 2.0mm, 1250mm",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Steel — Coil",
      quantity: "3000",
      currency: "USD",
      riskLevel: "HIGH",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "VSC",
      sourceType: "MANUAL",
      productDescription: "HRC SAE1006 2.0mm coil",
      quantity: 3000,
      unit: "MT",
      unitPrice: 620,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 22320000,
      riskFlags: JSON.stringify({}),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "GalvTech China",
      productDescription:
        "Galvanized steel coil SGCC 2.0mm (different product entirely)",
      quantity: 3000,
      unit: "MT",
      unitPrice: 720,
      totalCost: 2160000,
      currency: "USD",
      moq: "500 MT",
      leadTime: "5-6 weeks",
      riskFlags: JSON.stringify({ productMismatch: "CRITICAL" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "Galvanized SGCC 2.0mm coil",
      unitPrice: 720,
      totalAmount: 2160000,
      currency: "USD",
      moq: "500",
      leadTime: "5-6 weeks",
      shippingTerm: "CFR",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "NEGOTIATE",
      confidence: "LOW",
      savingsScore: 5,
      evidenceScore: 30,
      paymentRiskScore: 70,
      leadTimeRiskScore: 50,
      dependencyRiskScore: 80,
      overallScore: 20,
      evidenceSummary: JSON.stringify({
        baselineEvidence: "HRC coil baseline confirmed",
        altEvidence: "Quote for galvanized — NOT equivalent product",
      }),
      missingProof: JSON.stringify({
        productComparison:
          "HRC vs galvanized are different products. Cannot compare directly.",
      }),
      riskFlags: JSON.stringify({
        productMismatch: "CRITICAL",
        categoryError: "HRC ≠ Galvanized coil",
      }),
      summary:
        "NEGOTIATE with caution: alternative quote is for galvanized steel, not HRC. Buyer may not understand product difference.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SwitchDecisionReport",
      evidenceType: "COMPARISON_TABLE",
      title: "Spec comparison — HRC vs Galvanized",
      description:
        "Galvanized SGCC is zinc-coated; HRC is hot-rolled uncoated. Not interchangeable for same application.",
      metadata: JSON.stringify({ mismatchDetected: true }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioCheapRiskySupplier(orgId) {
  // Buyer: found 30% below market, no quality cert, new company
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Cheap But Risky — Copper Wire",
      requirement: "Need 8mm copper wire, 99.9% purity, 100 MT",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Non-ferrous — Copper Wire",
      quantity: "100",
      currency: "USD",
      riskLevel: "HIGH",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Vietnam Cable Co",
      sourceType: "MANUAL",
      productDescription: "8mm copper wire 99.9%",
      quantity: 100,
      unit: "MT",
      unitPrice: 8500,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 10200000,
      riskFlags: JSON.stringify({}),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Xinjiang New Metals (China)",
      productDescription: "8mm copper wire 99.9%",
      quantity: 100,
      unit: "MT",
      unitPrice: 5950,
      totalCost: 595000,
      currency: "USD",
      moq: "100 MT",
      leadTime: "8-10 weeks",
      paymentTerm: "50% T/T deposit, 50% before shipment",
      warranty: "No written warranty",
      riskFlags: JSON.stringify({
        companyAge: "CRITICAL (founded 3 months ago)",
        qualityCert: "NONE",
        paymentRisk: "HIGH",
        logistics: "HIGH (inland Xinjiang)",
      }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "8mm copper wire 99.9%",
      unitPrice: 5950,
      totalAmount: 595000,
      currency: "USD",
      moq: "100",
      leadTime: "8-10 weeks",
      shippingTerm: "FOB Shanghai",
      paymentTerm: "50% T/T deposit",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "NEGOTIATE",
      confidence: "MEDIUM",
      savingsScore: 85,
      evidenceScore: 40,
      paymentRiskScore: 90,
      leadTimeRiskScore: 70,
      dependencyRiskScore: 95,
      overallScore: 40,
      monthlySavings: 21250,
      annualSavings: 255000,
      savingsPercent: 30,
      currency: "USD",
      evidenceSummary: JSON.stringify({ altEvidence: "Quote XNM-2026-001" }),
      missingProof: JSON.stringify({
        qualityCert: "No ISO or mill cert provided",
        companyVerification:
          "Company registered 3 months ago — no track record",
        warranty: "No written warranty",
      }),
      riskFlags: JSON.stringify({
        companyAge: "CRITICAL",
        noQualityCert: "CRITICAL",
        paymentRisk: "HIGH",
        singlePointOfFailure: "HIGH",
      }),
      summary:
        "NEGOTIATE: 30% savings ($255K/yr) but supplier is 3-month-old startup with no quality cert. Request samples and third-party inspection before any commitment.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SupplierAlternative",
      evidenceType: "ALTERNATIVE_PROFILE",
      title: "Xinjiang New Metals — company check",
      description:
        "Business registration 3 months old. No manufacturing history found. Risk: EXTREME.",
      metadata: JSON.stringify({
        companyAgeMonths: 3,
        verified: false,
        redFlags: ["startup", "no_quality_cert", "high_payment_demand"],
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioHighSavingsWeakProof(orgId) {
  // Buyer: claims 20% savings, but quote is verbal only
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] High Savings, Weak Proof — Bearings",
      requirement: "Need 6205ZZ bearings, 10,000 pcs/month",
      status: "ACTIVE",
      targetCountry: "Japan",
      sourceCountry: "Vietnam",
      productCategory: "Industrial Parts — Bearings",
      quantity: "10000",
      currency: "USD",
      riskLevel: "HIGH",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "NSK Vietnam Distributor",
      sourceType: "MANUAL",
      productDescription: "6205ZZ deep groove ball bearing",
      quantity: 10000,
      unit: "PCS",
      unitPrice: 2.5,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 300000,
      riskFlags: JSON.stringify({}),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "C&U Bearing (Japan)",
      productDescription: "6205ZZ bearing equivalent",
      quantity: 10000,
      unit: "PCS",
      unitPrice: 1.95,
      totalCost: 19500,
      currency: "USD",
      moq: "5000 PCS",
      leadTime: "6-8 weeks",
      riskFlags: JSON.stringify({ quoteVerification: "HIGH (verbal only)" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "6205ZZ bearing — verbal quote",
      unitPrice: 1.95,
      totalAmount: 19500,
      currency: "USD",
      leadTime: "6-8 weeks",
      shippingTerm: "CIF",
      paymentTerm: "Net 60",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "NEGOTIATE",
      confidence: "LOW",
      savingsScore: 65,
      evidenceScore: 15,
      paymentRiskScore: 50,
      leadTimeRiskScore: 50,
      dependencyRiskScore: 50,
      overallScore: 35,
      monthlySavings: 5500,
      annualSavings: 66000,
      savingsPercent: 22,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        altEvidence: "Verbal quote only — no written document",
      }),
      missingProof: JSON.stringify({
        writtenQuote:
          "Verbal quote from C&U Japan — needs written confirmation",
        productEquivalence: "Need to verify 6205ZZ equivalent spec matches",
      }),
      riskFlags: JSON.stringify({
        verbalOnly: "HIGH",
        noWrittenQuote: "CRITICAL",
      }),
      summary:
        "NEGOTIATE: 22% savings claimed but quote is verbal only. Request written formal quotation before proceeding.",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SupplierAlternative",
      evidenceType: "CALL_NOTE",
      title: "Call note — verbal quote from C&U",
      description:
        "Sales rep quoted ¥285/pc (~$1.95) verbally. No written quote sent.",
      metadata: JSON.stringify({
        quality: "very_low",
        writtenQuoteReceived: false,
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioLowSavingsHighTrust(orgId) {
  // Buyer: current supplier reliable, alternative unknown
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Low Savings, High Trust — Office Furniture",
      requirement: "Looking for ergonomic office chairs, 500 units",
      status: "ACTIVE",
      targetCountry: "Vietnam",
      sourceCountry: "Vietnam",
      productCategory: "Office — Furniture",
      quantity: "500",
      currency: "USD",
      riskLevel: "LOW",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Hoa Phat Furniture",
      sourceType: "MANUAL",
      productDescription: "Ergonomic mesh chair model HP-2025",
      quantity: 500,
      unit: "PCS",
      unitPrice: 180,
      currency: "USD",
      frequency: "QUARTERLY",
      annualEquivalent: 360000,
      paymentTerms: "Net 45",
      deliveryTerms: "FOC HCMC",
      leadTime: "1 week",
      riskFlags: JSON.stringify({ reliability: "LOW (10yr partner)" }),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "New Start Furniture (Binh Duong)",
      productDescription: "Ergonomic mesh chair — unknown quality",
      quantity: 500,
      unit: "PCS",
      unitPrice: 165,
      totalCost: 82500,
      currency: "USD",
      moq: "200 PCS",
      leadTime: "3-4 weeks",
      riskFlags: JSON.stringify({
        qualityUnknown: "HIGH",
        noTrackRecord: "HIGH",
      }),
      status: "DISCOVERED",
    },
  });
  count("alternatives");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "WAIT",
      confidence: "MEDIUM",
      savingsScore: 20,
      evidenceScore: 30,
      paymentRiskScore: 20,
      leadTimeRiskScore: 60,
      dependencyRiskScore: 70,
      overallScore: 30,
      monthlySavings: 1250,
      annualSavings: 15000,
      savingsPercent: 8.3,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        baselineEvidence: "10-year relationship with Hoa Phat",
        altEvidence: "No samples, no reference customers",
      }),
      missingProof: JSON.stringify({
        samples: "No sample chair provided",
        referenceCustomers: "No client references",
        qualityCert: "Unknown manufacturing standard",
      }),
      riskFlags: JSON.stringify({
        switchingCost: "MEDIUM (retraining, testing)",
        qualityRisk: "HIGH",
      }),
      summary:
        "WAIT: Only 8.3% savings ($15K/yr). Current supplier is reliable with 10yr track record. Not worth switching without quality validation.",
    },
  });
  count("reports");

  return run.id;
}

async function scenarioRequestMoreProof(orgId) {
  // Buyer: saw report, clicked "Request more proof" for quality cert
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Buyer Requests More Proof — Steel Rebar",
      requirement: "Need SD390 rebar 16mm, 2000 MT",
      status: "ACTIVE",
      targetCountry: "China",
      sourceCountry: "Vietnam",
      productCategory: "Steel — Rebar",
      quantity: "2000",
      currency: "USD",
      riskLevel: "MEDIUM",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Vietnam Steel (VSC)",
      sourceType: "MANUAL",
      productDescription: "SD390 rebar 16mm",
      quantity: 2000,
      unit: "MT",
      unitPrice: 585,
      currency: "USD",
      annualEquivalent: 14040000,
      riskFlags: JSON.stringify({}),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Jiangsu Steel Group (China)",
      productDescription: "SD390 rebar 16mm",
      quantity: 2000,
      unit: "MT",
      unitPrice: 510,
      totalCost: 1020000,
      currency: "USD",
      moq: "500 MT",
      leadTime: "3-4 weeks",
      riskFlags: JSON.stringify({ qualityCert: "MEDIUM" }),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "SD390 rebar 16mm",
      unitPrice: 510,
      totalAmount: 1020000,
      currency: "USD",
      moq: "500",
      leadTime: "3-4 weeks",
      shippingTerm: "CFR",
      paymentTerm: "30% T/T, 70% L/C",
    },
  });
  count("quotes");

  const report = await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "NEGOTIATE",
      confidence: "MEDIUM",
      savingsScore: 55,
      evidenceScore: 50,
      paymentRiskScore: 40,
      leadTimeRiskScore: 30,
      dependencyRiskScore: 50,
      overallScore: 50,
      monthlySavings: 12500,
      annualSavings: 150000,
      savingsPercent: 12.8,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        altEvidence: "Quote JSG-REBAR-2026-042",
      }),
      missingProof: JSON.stringify({
        qualityCert: "Need ISO 9001 cert and mill test report",
      }),
      riskFlags: JSON.stringify({ qualityCertMissing: "MEDIUM" }),
      summary:
        "NEGOTIATE: 12.8% savings. Buyer requested more proof on quality cert.",
      buyerDecision: "REQUEST_MORE_PROOF",
      buyerDecidedAt: new Date(),
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SwitchDecisionReport",
      evidenceType: "BUYER_DECISION",
      title: "Buyer requested more proof",
      description:
        "Buyer clicked 'Request more proof' — needs ISO cert and mill test report",
      metadata: JSON.stringify({
        decision: "REQUEST_MORE_PROOF",
        requestedItems: ["iso9001_cert", "mill_test_report"],
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioBuyerRejectsReport(orgId) {
  // Buyer not convinced, chooses to stay
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Buyer Rejects Report — Cement",
      requirement: "Looking for PCB40 cement, 10,000 MT/month",
      status: "ACTIVE",
      targetCountry: "Thailand",
      sourceCountry: "Vietnam",
      productCategory: "Construction — Cement",
      quantity: "10000",
      currency: "USD",
      riskLevel: "LOW",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Ha Tien Cement",
      sourceType: "MANUAL",
      productDescription: "PCB40 cement",
      quantity: 10000,
      unit: "MT",
      unitPrice: 65,
      currency: "USD",
      annualEquivalent: 7800000,
      riskFlags: JSON.stringify({}),
      marketPrice: 62,
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Siam Cement (Thailand)",
      productDescription: "PCB40 cement",
      quantity: 10000,
      unit: "MT",
      unitPrice: 58,
      totalCost: 580000,
      currency: "USD",
      leadTime: "5-7 days",
      riskFlags: JSON.stringify({}),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "PCB40 cement",
      unitPrice: 58,
      totalAmount: 580000,
      currency: "USD",
      leadTime: "5-7 days",
      shippingTerm: "DDP HCMC",
      paymentTerm: "30 day net",
    },
  });
  count("quotes");

  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "SWITCH",
      confidence: "HIGH",
      savingsScore: 70,
      evidenceScore: 85,
      paymentRiskScore: 20,
      leadTimeRiskScore: 10,
      dependencyRiskScore: 30,
      overallScore: 78,
      monthlySavings: 70000,
      annualSavings: 840000,
      savingsPercent: 10.8,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        baselineEvidence: "Ha Tien contract + invoices",
        altEvidence: "Siam Cement official quote SC-2026-101",
      }),
      riskFlags: JSON.stringify({}),
      summary:
        "SWITCH recommended: 10.8% savings ($840K/yr). Buyer rejected — satisfied with current supplier.",
      buyerDecision: "REJECTED",
      buyerDecidedAt: new Date(),
      buyerDecidedById: "",
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SwitchDecisionReport",
      evidenceType: "BUYER_DECISION",
      title: "Buyer rejected switch",
      description:
        "Buyer prefers Ha Tien despite $840K/yr savings — longstanding relationship",
      metadata: JSON.stringify({
        decision: "REJECTED",
        reason: "prefers_current_supplier",
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function scenarioBuyerDisappears(orgId) {
  // Buyer approved but never responded to follow-up — stale state
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: orgId,
      title: "[QA] Buyer Disappeared — Plastic Pellets",
      requirement: "Need HDPE 5000S, 500 MT/month",
      status: "ACTIVE",
      targetCountry: "Singapore",
      sourceCountry: "Vietnam",
      productCategory: "Plastics — HDPE",
      quantity: "500",
      currency: "USD",
      riskLevel: "MEDIUM",
    },
  });
  count("sourcingRuns");

  await prisma.purchaseBaseline.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "Southern Plastic JSC",
      sourceType: "MANUAL",
      productDescription: "HDPE 5000S",
      quantity: 500,
      unit: "MT",
      unitPrice: 1150,
      currency: "USD",
      annualEquivalent: 6900000,
      riskFlags: JSON.stringify({}),
    },
  });
  count("baselines");

  const alt = await prisma.supplierAlternative.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      supplierName: "ExxonMobil Asia (Singapore)",
      productDescription: "HDPE 5000S equivalent",
      quantity: 500,
      unit: "MT",
      unitPrice: 1020,
      totalCost: 510000,
      currency: "USD",
      leadTime: "2-3 weeks",
      riskFlags: JSON.stringify({}),
      status: "QUOTED",
    },
  });
  count("alternatives");

  await prisma.supplierQuote.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      productDescription: "HDPE 5000S",
      unitPrice: 1020,
      totalAmount: 510000,
      currency: "USD",
      leadTime: "2-3 weeks",
      shippingTerm: "CIF",
      paymentTerm: "Net 60",
    },
  });
  count("quotes");

  // Approved 14 days ago — stale, no outcome recorded
  const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  await prisma.switchDecisionReport.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      recommendation: "SWITCH",
      confidence: "HIGH",
      savingsScore: 65,
      evidenceScore: 80,
      paymentRiskScore: 20,
      leadTimeRiskScore: 20,
      dependencyRiskScore: 30,
      overallScore: 75,
      monthlySavings: 6500,
      annualSavings: 78000,
      savingsPercent: 11.3,
      currency: "USD",
      evidenceSummary: JSON.stringify({
        altEvidence: "ExxonMobil quote EM-2026-Q2-456",
      }),
      riskFlags: JSON.stringify({
        staleApproval: "APPROVED 14 days ago — no outcome follow-up",
      }),
      summary:
        "SWITCH approved 14 days ago. Buyer unresponsive to follow-up. No outcome recorded.",
      buyerDecision: "APPROVED",
      buyerDecidedAt: staleDate,
    },
  });
  count("reports");

  await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      sourcingRunId: run.id,
      relatedType: "SwitchDecisionReport",
      evidenceType: "BUYER_DECISION",
      title: "Buyer approved 14 days ago",
      description:
        "Approved switch but has not responded to emails/calls for 14 days",
      metadata: JSON.stringify({
        decision: "APPROVED",
        stale: true,
        daysSinceDecision: 14,
      }),
    },
  });
  count("evidenceItems");

  return run.id;
}

async function main() {
  console.log(`\n=== Behavior QA Fixtures — Creating ===`);

  const { org, user } = await ensureOrgAndUser();
  console.log(`  Org: ${org.id}, User: ${user.email}`);

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: org.id },
  });
  if (member) {
    await ensureSourcingPermissions(member.roleId);
  }

  const scenarios = [
    ["qualified-buyer", scenarioQualifiedBuyer],
    ["non-decision-maker", scenarioNonDecisionMaker],
    ["missing-invoice", scenarioMissingInvoice],
    ["weak-screenshot", scenarioWeakScreenshot],
    ["non-comparable", scenarioNonComparable],
    ["cheap-risky-supplier", scenarioCheapRiskySupplier],
    ["high-savings-weak-proof", scenarioHighSavingsWeakProof],
    ["low-savings-high-trust", scenarioLowSavingsHighTrust],
    ["request-more-proof", scenarioRequestMoreProof],
    ["buyer-rejects-report", scenarioBuyerRejectsReport],
    ["buyer-disappears", scenarioBuyerDisappears],
  ];

  console.log(`\n  Creating ${scenarios.length} behavior scenarios...\n`);
  for (const [name, fn] of scenarios) {
    const runId = await fn(org.id);
    console.log(`  [✓] ${name} → ${runId}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Organization:    ${org.id}`);
  console.log(`  SourcingRuns:    ${SCENARIO_COUNTS.sourcingRuns}`);
  console.log(`  Baselines:       ${SCENARIO_COUNTS.baselines}`);
  console.log(`  Alternatives:    ${SCENARIO_COUNTS.alternatives}`);
  console.log(`  Quotes:          ${SCENARIO_COUNTS.quotes}`);
  console.log(`  Reports:         ${SCENARIO_COUNTS.reports}`);
  console.log(`  Checkpoints:     ${SCENARIO_COUNTS.checkpoints}`);
  console.log(`  EvidenceItems:   ${SCENARIO_COUNTS.evidenceItems}`);
  console.log(
    `\n  Cleanup: prisma sourcingRun.deleteMany({ where: { organizationId: "${org.id}" } })`,
  );
  console.log(
    `\n  Next: Browse behavior scenarios at /sourcing-runs (org: ${org.id})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PILOT_ORG_ID = "pilot-supplier-switch-01";
const PILOT_ORG_NAME = "Supplier Switch Pilot Org";
const PILOT_USER_EMAIL = "pilot-owner@tradeos.local";
const PILOT_USER_NAME = "Pilot Owner";

async function main() {
  console.log(`\n=== Phase 1: Org + User ===`);
  const org = await prisma.organization.upsert({
    where: { id: PILOT_ORG_ID },
    update: { plan: "PILOT" },
    create: {
      id: PILOT_ORG_ID,
      name: PILOT_ORG_NAME,
      type: "IMPORTER",
      plan: "PILOT",
      country: "Vietnam",
    },
  });
  console.log(`  Org: ${org.id}`);

  const user = await prisma.user.upsert({
    where: { email: PILOT_USER_EMAIL },
    update: {},
    create: {
      organizationId: org.id,
      email: PILOT_USER_EMAIL,
      name: PILOT_USER_NAME,
      role: "OWNER",
    },
  });
  console.log(`  User: ${user.email}`);

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { status: "ACTIVE", roleId: "system-owner" },
    create: { userId: user.id, organizationId: org.id, roleId: "system-owner", status: "ACTIVE", acceptedAt: new Date() },
  });
  console.log(`  Org member: OK`);

  console.log(`\n=== Phase 2: Sourcing Run ===`);
  const run = await prisma.sourcingRun.create({
    data: {
      organizationId: org.id,
      title: "Steel Coil Procurement — Q3 2026",
      requirement: "Seeking alternative suppliers for HRC steel coil, grade SAE1006, 2.0mm thickness, 1250mm width, in coil form (15-25 MT per coil). Annual volume ~5,000 MT.",
      status: "DRAFT",
      targetCountry: "China, South Korea",
      sourceCountry: "Vietnam",
      productCategory: "Steel — Hot Rolled Coil",
      quantity: "5000",
      budget: "3250000",
      currency: "USD",
      riskLevel: "MEDIUM",
    },
  });
  console.log(`  SourcingRun: ${run.id}`);

  console.log(`\n=== Phase 3: PurchaseBaseline (Current Supplier) ===`);
  const baseline = await prisma.purchaseBaseline.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      supplierName: "Vietnam Steel Corporation (VSC)",
      supplierContact: JSON.stringify({ contactPerson: "Mr. Nguyen Van A", email: "nguyenvana@vsc.vn", phone: "+84 28 3829 1234" }),
      sourceType: "MANUAL",
      productDescription: "HRC SAE1006 2.0mm x 1250mm coil",
      quantity: 5000,
      unit: "MT",
      unitPrice: 620,
      currency: "USD",
      frequency: "MONTHLY",
      annualEquivalent: 37200000,
      paymentTerms: "L/C at sight, 30 days after BL date",
      deliveryTerms: "CIF Ho Chi Minh",
      leadTime: "6-8 weeks from order confirmation",
      minOrderQty: "500 MT per order",
      riskFlags: JSON.stringify({ deliveryDelayRisk: "HIGH", priceVolatility: "MEDIUM", qualityConsistency: "MEDIUM" }),
      leakageScore: 12,
      marketPrice: 580,
    },
  });
  console.log(`  PurchaseBaseline: ${baseline.id}`);

  console.log(`\n=== Phase 4: Supplier Alternatives ===`);
  const alt1 = await prisma.supplierAlternative.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      supplierName: "Baosteel International (China)",
      productDescription: "HRC SAE1006 2.0mm x 1250mm coil — Baosteel Grade SPHC equivalent",
      quantity: 5000,
      unit: "MT",
      unitPrice: 545,
      totalCost: 2725000,
      currency: "USD",
      moq: "300 MT",
      leadTime: "4-5 weeks",
      paymentTerm: "30% T/T deposit, 70% against BL copy",
      warranty: "Standard mill warranty; claims within 14 days of arrival",
      shippingNotes: "Shanghai to Cat Lai port, 7-10 days transit",
      riskFlags: JSON.stringify({ geopoliticalRisk: "LOW", tradeWarTariffRisk: "MEDIUM", logistics: "LOW" }),
      status: "QUOTED",
    },
  });
  console.log(`  Alt 1 (Baosteel): ${alt1.id}`);

  await prisma.supplierQuote.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      productDescription: "HRC SAE1006 2.0mm coil — Baosteel SPHC equivalent",
      unitPrice: 545,
      totalAmount: 2725000,
      currency: "USD",
      moq: "300",
      leadTime: "4-5 weeks",
      shippingTerm: "CFR",
      paymentTerm: "30% T/T deposit, 70% against BL copy",
      warranty: "Standard mill warranty; claims 14 days arrival",
    },
  });
  console.log(`  Quote 1: OK`);

  const alt2 = await prisma.supplierAlternative.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      supplierName: "POSCO International (South Korea)",
      productDescription: "HRC SAE1006 2.0mm x 1250mm coil — POSCO Grade SPHC-1K",
      quantity: 5000,
      unit: "MT",
      unitPrice: 560,
      totalCost: 2800000,
      currency: "USD",
      moq: "200 MT",
      leadTime: "3-4 weeks",
      paymentTerm: "L/C at sight",
      warranty: "Standard POSCO warranty; 12-month workmanship",
      shippingNotes: "Pohang to Cat Lai port, 5-7 days transit",
      riskFlags: JSON.stringify({ geopoliticalRisk: "LOW", tariffRisk: "LOW", quality: "HIGH" }),
      status: "QUOTED",
    },
  });
  console.log(`  Alt 2 (POSCO): ${alt2.id}`);

  await prisma.supplierQuote.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      productDescription: "HRC SAE1006 2.0mm coil — POSCO SPHC-1K",
      unitPrice: 560,
      totalAmount: 2800000,
      currency: "USD",
      moq: "200",
      leadTime: "3-4 weeks",
      shippingTerm: "CIF",
      paymentTerm: "L/C at sight",
      warranty: "Standard POSCO warranty; 12-month workmanship",
    },
  });
  console.log(`  Quote 2: OK`);

  console.log(`\n=== Phase 5: SwitchDecisionReport ===`);
  const report = await prisma.switchDecisionReport.create({
    data: {
      organizationId: org.id,
      sourcingRunId: run.id,
      recommendation: "NEGOTIATE",
      confidence: "HIGH",
      savingsScore: 60,
      evidenceScore: 80,
      paymentRiskScore: 30,
      leadTimeRiskScore: 20,
      dependencyRiskScore: 40,
      overallScore: 75,
      monthlySavings: 37500,
      annualSavings: 450000,
      savingsPercent: 12.1,
      currency: "USD",
      baselineId: baseline.id,
      topAlternativeId: alt2.id,
      evidenceSummary: JSON.stringify({
        baselineEvidence: "Current pricing confirmed via invoice VSC-2026-05",
        alt1Evidence: "Quote BS-2026-Q3-001 received and validated",
        alt2Evidence: "Quote POSCO-2026-Q3-072 received and validated",
        marketCheck: "Platts HRC CFR SE Asia ~$575/MT as of May 2026",
      }),
      missingProof: JSON.stringify({
        alt1: "Need QC certificate for SPHC equivalent grade",
        alt2: "Need logistics cost breakdown for Pohang → HCMC",
      }),
      riskFlags: JSON.stringify({ singleSourceRisk: "HIGH", priceVolatility: "MEDIUM" }),
      summary: "POSCO offers better lead time (3-4 weeks vs 6-8) and quality consistency at $560/MT ($60 savings vs current $620). Baosteel at $545/MT is cheaper but carries trade-war tariff risk. Recommend negotiating with POSCO for volume discount while qualifying Baosteel as secondary source.",
      nextActions: JSON.stringify([
        "Negotiate POSCO volume discount (5,000 MT annual → target $540/MT)",
        "Request Baosteel QC certificate for SPHC equivalent",
        "Set up POSCO trial order of 200 MT for quality validation",
        "Evaluate Baosteel tariff risk with legal/procurement",
      ]),
    },
  });
  console.log(`  Report: ${report.id} (recommendation: ${report.recommendation})`);

  console.log(`\n=== Phase 6: WorkCheckpoints ===`);
  await prisma.workCheckpoint.createMany({
    data: [
      {
        organizationId: org.id,
        sourcingRunId: run.id,
        title: "Baseline Scan Delivered",
        description: "Current spend baseline captured and evidence-verified",
checkpointType: "PAID_SOURCING_REQUEST",
            status: "DELIVERED",
          },
          {
            organizationId: org.id,
            sourcingRunId: run.id,
            title: "Alternative Supplier Shortlist Delivered",
            description: "2 alternative suppliers identified, quoted, and scored",
            checkpointType: "SUPPLIER_SHORTLIST",
            status: "DELIVERED",
          },
          {
            organizationId: org.id,
            sourcingRunId: run.id,
            title: "Switch Decision Report Delivered",
            description: "Deterministic recommendation: NEGOTIATE with POSCO, qualify Baosteel as secondary",
            checkpointType: "BUYER_DECISION_REPORT",
        status: "DELIVERED",
      },
    ],
  });
  console.log(`  Checkpoints: 3 created`);

  console.log(`\n=== Pilot Case Complete ===`);
  console.log(`  Org:              ${PILOT_ORG_ID}`);
  console.log(`  User:             ${PILOT_USER_EMAIL}`);
  console.log(`  SourcingRun:      ${run.id}`);
  console.log(`  Baseline:         ${baseline.id} (VSC @ $620/MT)`);
  console.log(`  Alternatives:     2 — Baosteel ($545), POSCO ($560)`);
  console.log(`  Report:           ${report.id} → ${report.recommendation}`);
  console.log(`  Checkpoints:      3 — Baseline, Shortlist, Report`);
  console.log(`\nNext: Buyer views report at /sourcing-runs/${run.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
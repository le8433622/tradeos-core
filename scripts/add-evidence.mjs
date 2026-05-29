// Add evidence items for the Jasmine Rice case via executeAction
// Run: node scripts/add-evidence.mjs <run-id>
import { executeAction } from "@tradeos/policy-core";
import { prisma } from "@tradeos/database";
import "@tradeos/evidence-core";

const RUN_ID = process.argv[2];
if (!RUN_ID) {
  console.error("Usage: node scripts/add-evidence.mjs <run-id>");
  process.exit(1);
}

// Resolve the owner user for demo context
const user = await prisma.user.findUnique({
  where: { email: "owner@tradeos.local" },
});

if (!user) {
  console.error("User not found");
  process.exit(1);
}

const ctx = {
  actorUserId: user.id,
  organizationId: "demo-org",
  role: "OWNER",
  source: "manual",
  mfaLevel: "aal1",
};

const evidence = [
  {
    title: "VFA Export Price List - Q1 2026",
    description: "Vietnam Food Association official export price list for Jasmine Rice 5% broken, showing market range of USD 475-520/MT FOB HCMC for Q1 2026.",
    evidenceType: "MARKET_BENCHMARK",
    externalUrl: "https://vfa.org.vn/price-list/q1-2026",
  },
  {
    title: "FAO Food Price Index - Rice",
    description: "FAO International Food Price Index for Rice - March 2026. Indicates softening demand with 3.2% month-on-month decrease in rice prices globally.",
    evidenceType: "MARKET_BENCHMARK",
    externalUrl: "https://www.fao.org/food-agriculture-statistics/fpi",
  },
  {
    title: "Current Supplier Invoice - Jan 2026",
    description: "Invoice from Mekong Delta Rice Co. dated 15 Jan 2026 for 200MT Jasmine Rice 5% broken at USD 510/MT FOB HCMC. Payment via LC at sight.",
    evidenceType: "CURRENT_SUPPLIER_INVOICE",
  },
];

for (const ev of evidence) {
  const result = await executeAction(
    "evidence.createItem",
    {
      organizationId: "demo-org",
      sourcingRunId: RUN_ID,
      relatedType: "SOURCING_RUN",
      relatedId: RUN_ID,
      evidenceType: ev.evidenceType,
      title: ev.title,
      description: ev.description,
      externalUrl: ev.externalUrl,
    },
    ctx,
  );
  console.log(`Created evidence: ${ev.title} -> ${result.id}`);
}

console.log("\nDone. Regenerate switch decision report to see updated recommendation.");
await prisma.$disconnect();
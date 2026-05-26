#!/usr/bin/env node
const path = require("path");

const prismaDir = path.resolve(
  __dirname,
  "..",
  "packages",
  "database",
  "node_modules",
);
const { PrismaClient } = require(path.join(prismaDir, "@prisma", "client"));

const prisma = new PrismaClient();

const ORG = "pilot-supplier-switch-01";
const SOURCING_RUN_ID = "cmpmny3xx0005cqxdjtfklyn1";
const REPORT_ID = "cmpmny5qc000hcqxdqt3qrwn3";

async function main() {
  console.log(`\n=== Record Pilot Outcome ===`);
  console.log(`  Org:           ${ORG}`);
  console.log(`  SourcingRun:   ${SOURCING_RUN_ID}`);
  console.log(`  Linked Report: ${REPORT_ID}`);

  const existing = await prisma.outcomeRecord.findFirst({
    where: { organizationId: ORG, sourcingRunId: SOURCING_RUN_ID },
  });

  if (existing) {
    console.log(`  Outcome already exists: ${existing.id}`);
    console.log(`  Buyer action: ${existing.buyerAction}`);
    console.log(`  Skipping creation (idempotent).`);
    return;
  }

  const outcome = await prisma.outcomeRecord.create({
    data: {
      organizationId: ORG,
      sourcingRunId: SOURCING_RUN_ID,
      linkedReportId: REPORT_ID,
      buyerAction: "NEGOTIATE",
      learningNote:
        "First outcome placeholder. Buyer is negotiating with Baosteel ($545/MT) vs POSCO ($560/MT). Report recommended NEGOTIATE. Quality and final price pending.",
    },
  });

  console.log(`  ✅ Outcome recorded: ${outcome.id}`);
  console.log(`  Buyer action: ${outcome.buyerAction}`);
  console.log(`  Learning loop closed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

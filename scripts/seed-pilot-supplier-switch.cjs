#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PILOT_ORG_ID = "pilot-supplier-switch-01";
const PILOT_ORG_NAME = "Supplier Switch Pilot Org";
const PILOT_USER_EMAIL = "pilot-owner@tradeos.local";
const PILOT_USER_NAME = "Pilot Owner";

async function main() {
  console.log(`Seeding pilot org: ${PILOT_ORG_ID}`);

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
  console.log(`  Org: ${org.id} (${org.plan})`);

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
  console.log(`  User: ${user.email} (${user.role})`);

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { status: "ACTIVE", roleId: "system-owner" },
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: "system-owner",
      status: "ACTIVE",
      acceptedAt: new Date(),
    },
  });
  console.log(`  Org member: ${user.id} -> ${org.id}`);

  console.log("\nDone. Pilot org ready.");
  console.log(`  Org ID:    ${PILOT_ORG_ID}`);
  console.log(`  User:      ${PILOT_USER_EMAIL}`);
  console.log(`  Auth:      demo auth with email ${PILOT_USER_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
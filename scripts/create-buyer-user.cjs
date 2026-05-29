const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "leh146215@gmail.com";
  const orgId = "demo-org";

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId: orgId,
        email,
        name: "Long An Buyer",
        role: "BUYER_REVIEWER",
      },
    });
    console.log("Created user:", user.id);
  } else {
    console.log("User already exists:", user.id);
  }

  // Create or update org membership
  const existing = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId: user.id, organizationId: orgId },
    },
  });

  if (!existing) {
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        roleId: "system-buyer_reviewer",
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    console.log("Created org membership");
  } else {
    await prisma.organizationMember.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", roleId: "system-buyer_reviewer" },
    });
    console.log("Updated org membership");
  }

  // Mark invitation as accepted
  const invitation = await prisma.invitation.findFirst({
    where: { email, organizationId: orgId, acceptedAt: null },
  });
  if (invitation) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    console.log("Accepted invitation");
  }

  console.log("\nDone. User leh146215@gmail.com is now a BUYER_REVIEWER.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
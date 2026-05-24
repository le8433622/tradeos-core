import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS: {
  key: string;
  name: string;
  description: string;
  group: string;
}[] = [
  // Lead
  {
    key: "lead.read",
    name: "Read leads",
    description: "View lead list and details",
    group: "lead",
  },
  {
    key: "lead.write",
    name: "Write leads",
    description: "Create and update leads",
    group: "lead",
  },
  {
    key: "lead.delete",
    name: "Delete leads",
    description: "Permanently delete leads",
    group: "lead",
  },
  // Company
  {
    key: "company.read",
    name: "Read companies",
    description: "View company list and details",
    group: "company",
  },
  {
    key: "company.write",
    name: "Write companies",
    description: "Create and update companies",
    group: "company",
  },
  // Contact
  {
    key: "contact.read",
    name: "Read contacts",
    description: "View contact list and details",
    group: "contact",
  },
  {
    key: "contact.write",
    name: "Write contacts",
    description: "Create and update contacts",
    group: "contact",
  },
  // Quotation
  {
    key: "quotation.draft",
    name: "Draft quotations",
    description: "Create and edit draft quotations",
    group: "quotation",
  },
  {
    key: "quotation.send",
    name: "Send quotations",
    description: "Send quotations to customers",
    group: "quotation",
  },
  {
    key: "quotation.delete",
    name: "Delete quotations",
    description: "Delete quotations",
    group: "quotation",
  },
  // Product
  {
    key: "product.read",
    name: "Read products",
    description: "View product catalog",
    group: "product",
  },
  {
    key: "product.write",
    name: "Write products",
    description: "Create and update products",
    group: "product",
  },
  // Message
  {
    key: "message.read",
    name: "Read messages",
    description: "View conversations and messages",
    group: "message",
  },
  {
    key: "message.write",
    name: "Write messages",
    description: "Send messages in conversations",
    group: "message",
  },
  // Approval
  {
    key: "approval.review",
    name: "Review approvals",
    description: "View and comment on approval requests",
    group: "approval",
  },
  {
    key: "approval.write",
    name: "Create approvals",
    description: "Create new approval requests",
    group: "approval",
  },
  {
    key: "approval.execute",
    name: "Execute approvals",
    description: "Approve, reject, and execute approval requests",
    group: "approval",
  },
  // Webhook
  {
    key: "webhook.retry",
    name: "Retry webhooks",
    description: "Retry failed webhook events",
    group: "webhook",
  },
  {
    key: "webhook.receive",
    name: "Receive webhooks",
    description: "Receive inbound webhook events",
    group: "webhook",
  },
  // Billing
  {
    key: "billing.read",
    name: "Read billing",
    description: "View billing and usage metrics",
    group: "billing",
  },
  {
    key: "billing.manage",
    name: "Manage billing",
    description: "Change plan and payment settings",
    group: "billing",
  },
  {
    key: "billing.export",
    name: "Export billing",
    description: "Export billing and usage data",
    group: "billing",
  },
  // Privacy
  {
    key: "privacy.export",
    name: "Export data",
    description: "Export tenant data bundle",
    group: "privacy",
  },
  {
    key: "privacy.anonymize",
    name: "Anonymize PII",
    description: "Anonymize personally identifiable information",
    group: "privacy",
  },
  {
    key: "privacy.legalHold",
    name: "Legal hold",
    description: "Enable/disable legal hold on organization",
    group: "privacy",
  },
  // User
  {
    key: "user.invite",
    name: "Invite users",
    description: "Send user invitations",
    group: "user",
  },
  {
    key: "user.roleUpdate",
    name: "Update roles",
    description: "Change user roles",
    group: "user",
  },
  {
    key: "user.suspend",
    name: "Suspend users",
    description: "Suspend and reactivate users",
    group: "user",
  },
  {
    key: "user.remove",
    name: "Remove users",
    description: "Remove users from organization",
    group: "user",
  },
  // Settings
  {
    key: "settings.profile",
    name: "Profile settings",
    description: "Manage organization profile",
    group: "settings",
  },
  {
    key: "settings.security",
    name: "Security settings",
    description: "Manage security and MFA policy",
    group: "settings",
  },
  {
    key: "settings.billing",
    name: "Billing settings",
    description: "Manage billing configuration",
    group: "settings",
  },
  // Organization settings
  {
    key: "organization.settings.read",
    name: "Read org settings",
    description: "View organization settings",
    group: "organization",
  },
  {
    key: "organization.settings.write",
    name: "Write org settings",
    description: "Update organization settings",
    group: "organization",
  },
  // Audit
  {
    key: "audit.read",
    name: "Read audit logs",
    description: "View and export audit logs",
    group: "audit",
  },
  // Integration
  {
    key: "integration.manage",
    name: "Manage integrations",
    description: "Configure webhook integrations",
    group: "integration",
  },
  // AI
  {
    key: "ai.budgetManage",
    name: "Manage AI budget",
    description: "Configure AI monthly budget",
    group: "ai",
  },
  {
    key: "ai.use",
    name: "Use AI",
    description: "Execute AI agent actions",
    group: "ai",
  },
  // Report
  {
    key: "report.generate",
    name: "Generate reports",
    description: "Create and view reports",
    group: "report",
  },
  {
    key: "report.approve",
    name: "Approve reports",
    description: "Approve report snapshots",
    group: "report",
  },
  // Introduction
  {
    key: "introduction.read",
    name: "Read introductions",
    description: "View partner introductions",
    group: "introduction",
  },
  {
    key: "introduction.propose",
    name: "Propose introductions",
    description: "Propose buyer/seller introductions",
    group: "introduction",
  },
  {
    key: "introduction.manage",
    name: "Manage introduction settings",
    description:
      "Toggle introduction readiness and cross-tenant introduction settings",
    group: "introduction",
  },
  // Notification
  {
    key: "notification.manage",
    name: "Manage notifications",
    description: "Create and manage notifications",
    group: "notification",
  },
  {
    key: "notification.send",
    name: "Send notifications",
    description: "Publish bulk notifications to an audience",
    group: "notification",
  },
  // Task
  {
    key: "task.read",
    name: "Read tasks",
    description: "View tasks",
    group: "task",
  },
  {
    key: "task.write",
    name: "Write tasks",
    description: "Create, update, and complete tasks",
    group: "task",
  },
  // Sourcing
  {
    key: "sourcing.list",
    name: "List sourcing runs",
    description: "View list of sourcing runs",
    group: "sourcing",
  },
  {
    key: "sourcing.view",
    name: "View sourcing runs",
    description: "View sourcing run details",
    group: "sourcing",
  },
  {
    key: "sourcing.create",
    name: "Create sourcing runs",
    description: "Create new sourcing runs",
    group: "sourcing",
  },
  {
    key: "sourcing.manage",
    name: "Manage sourcing runs",
    description: "Update, add suppliers, quotes, compare, and manage sourcing runs",
    group: "sourcing",
  },
  {
    key: "sourcing.deliverReport",
    name: "Deliver buyer report",
    description: "Generate and deliver buyer decision report",
    group: "sourcing",
  },
];

type RoleDef = {
  name: string;
  description: string;
  permissions: string[];
};

const ROLES: RoleDef[] = [
  {
    name: "OWNER",
    description:
      "Full access to all features, billing, security, and user management",
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "ADMIN",
    description:
      "Operational administration — most permissions except sensitive security and billing changes",
    permissions: PERMISSIONS.filter(
      (p) =>
        ![
          "billing.manage",
          "privacy.anonymize",
          "privacy.legalHold",
          "user.roleUpdate",
          "settings.security",
        ].includes(p.key),
    ).map((p) => p.key),
  },
  {
    name: "SALES",
    description:
      "Sales-focused: leads, companies, contacts, quotations, products, tasks",
    permissions: [
      "lead.read",
      "lead.write",
      "company.read",
      "company.write",
      "contact.read",
      "contact.write",
      "quotation.draft",
      "product.read",
      "product.write",
      "message.read",
      "message.write",
      "task.read",
      "task.write",
      "report.generate",
      "ai.use",
      "sourcing.list",
      "sourcing.view",
      "sourcing.create",
      "sourcing.manage",
    ],
  },
  {
    name: "OPERATOR",
    description:
      "Operations: inbox, webhooks, approvals queue, introductions, AI agent",
    permissions: [
      "lead.read",
      "company.read",
      "contact.read",
      "product.read",
      "message.read",
      "quotation.draft",
      "approval.review",
      "webhook.retry",
      "introduction.read",
      "introduction.propose",
      "task.read",
      "task.write",
      "notification.manage",
      "report.generate",
      "ai.use",
      "sourcing.list",
      "sourcing.view",
    ],
  },
  {
    name: "VIEWER",
    description: "Read-only: dashboards, reports, and lists without mutation",
    permissions: [
      "lead.read",
      "company.read",
      "contact.read",
      "product.read",
      "message.read",
      "task.read",
      "report.generate",
      "sourcing.list",
      "sourcing.view",
    ],
  },
];

async function seedPermissions() {
  const permissionMap: Record<string, string> = {};

  for (const p of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, group: p.group },
      create: p,
    });
    permissionMap[p.key] = created.id;
  }

  console.log(`  Seeded ${Object.keys(permissionMap).length} permissions`);

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { id: `system-${roleDef.name.toLowerCase()}` },
      update: { name: roleDef.name, description: roleDef.description },
      create: {
        id: `system-${roleDef.name.toLowerCase()}`,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    for (const permKey of roleDef.permissions) {
      const permId = permissionMap[permKey];
      if (!permId) {
        console.warn(
          `  Warning: permission "${permKey}" not found for role ${roleDef.name}`,
        );
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permId },
        },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }

    console.log(
      `  Seeded role "${roleDef.name}" with ${roleDef.permissions.length} permissions`,
    );
  }
}

async function main() {
  console.log("Seeding permissions and roles...");
  await seedPermissions();

  const organization = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Demo International Trade Association",
      type: "ASSOCIATION",
      country: "Vietnam",
      website: "https://example.com",
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@tradeos.local" },
    update: {},
    create: {
      organizationId: organization.id,
      email: "owner@tradeos.local",
      name: "TradeOS Owner",
      role: "OWNER",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: ownerUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: ownerUser.id,
      organizationId: organization.id,
      roleId: "system-owner",
      status: "ACTIVE",
      acceptedAt: new Date(),
    },
  });

  const seller = await prisma.company.create({
    data: {
      organizationId: organization.id,
      name: "Vietnam Premium Exporter",
      country: "Vietnam",
      industry: "Agriculture and consumer goods",
      type: "SELLER",
      website: "https://seller.example.com",
      notes: "Demo exporter for pilot matching.",
    },
  });

  await prisma.company.create({
    data: {
      organizationId: organization.id,
      name: "Singapore Distribution Partner",
      country: "Singapore",
      industry: "Distribution and retail",
      type: "BUYER",
      website: "https://buyer.example.com",
      notes: "Demo buyer/distributor for ASEAN market.",
    },
  });

  await prisma.product.create({
    data: {
      organizationId: organization.id,
      name: "Vietnam Export Sample Product",
      category: "Consumer Goods",
      description: "Demo product for quotation and buyer matching flows.",
      originCountry: "Vietnam",
      priceRange: "1000-5000 USD",
      moq: "100 units",
      certification: "Demo certification",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: organization.id,
      companyId: seller.id,
      source: "web",
      name: "Demo Buyer",
      email: "buyer@example.com",
      need: "Needs quotation for Vietnam export product to Singapore.",
      status: "QUALIFIED",
      score: 80,
      aiSummary: "Buyer is interested in import/distribution opportunity.",
      nextAction: "Prepare quotation draft and schedule follow-up.",
    },
  });

  await prisma.task.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      title: "Follow up with Demo Buyer",
      description: "Send catalog and draft quotation for review.",
      status: "open",
    },
  });

  await prisma.quotation.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      title: "Demo quotation draft",
      content: "Draft quotation content for Vietnam export product.",
      status: "DRAFT",
      totalAmount: 2500,
      currency: "USD",
    },
  });

  await prisma.conversation.create({
    data: {
      organizationId: organization.id,
      channel: "WEB",
      title: "Buyer asks for quotation",
      aiSummary: "Inbound buyer asks for pricing, MOQ, and delivery timeline.",
      messages: {
        create: [
          {
            senderType: "CUSTOMER",
            content: "We need a quotation for export to Singapore.",
          },
          {
            senderType: "AI",
            content: "Lead captured. Suggested next action: draft quotation.",
          },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      organizationId: organization.id,
      title: "Demo trade opportunity",
      body: "A Singapore distributor is looking for Vietnam export suppliers.",
      audience: "organization",
      status: "draft",
    },
  });

  console.log("Seed completed for organization:", organization.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
  {
    key: "report.publish",
    name: "Publish reports",
    description: "Publish buyer-facing reports",
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
    description:
      "Update, add suppliers, quotes, compare, and manage sourcing runs",
    group: "sourcing",
  },
  {
    key: "sourcing.deliverReport",
    name: "Deliver buyer report",
    description: "Generate and deliver buyer decision report",
    group: "sourcing",
  },
  // Evidence
  {
    key: "evidence.view_summary",
    name: "View evidence summary",
    description: "View buyer-safe evidence summaries",
    group: "evidence",
  },
  {
    key: "evidence.view_raw",
    name: "View raw evidence",
    description: "View unredacted supplier/source evidence",
    group: "evidence",
  },
  {
    key: "evidence.upload",
    name: "Upload evidence",
    description: "Attach evidence to sourcing work",
    group: "evidence",
  },
  {
    key: "evidence.redact",
    name: "Redact evidence",
    description: "Create buyer-safe redactions",
    group: "evidence",
  },
  // Buyer
  {
    key: "buyerReport.view_assigned",
    name: "View assigned buyer reports",
    description: "View only buyer reports assigned to this reviewer",
    group: "buyer",
  },
  {
    key: "buyerDecision.submit_assigned",
    name: "Submit assigned buyer decision",
    description: "Approve, reject, or request proof for assigned buyer reports",
    group: "buyer",
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
      "evidence.view_summary",
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
      "sourcing.create",
      "sourcing.manage",
      "evidence.view_summary",
      "evidence.upload",
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
      "evidence.view_summary",
    ],
  },
  {
    name: "BUYER_REVIEWER",
    description:
      "External buyer reviewer: assigned buyer reports and buyer-safe evidence only",
    permissions: [
      "buyerReport.view_assigned",
      "buyerDecision.submit_assigned",
      "evidence.view_summary",
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

async function seedPlanLimits() {
  const planLimits: {
    plan: string;
    feature: string;
    limitValue: number;
    description: string;
  }[] = [
    {
      plan: "FREE",
      feature: "seats",
      limitValue: 2,
      description: "Max active members",
    },
    {
      plan: "FREE",
      feature: "inbound_messages",
      limitValue: 100,
      description: "Max inbound messages per month",
    },
    {
      plan: "FREE",
      feature: "ai_monthly_budget",
      limitValue: 0,
      description: "AI usage budget (USD)",
    },
    {
      plan: "FREE",
      feature: "integrations",
      limitValue: 1,
      description: "Max webhook integrations",
    },
    {
      plan: "FREE",
      feature: "sourcing_runs",
      limitValue: 3,
      description: "Max active sourcing runs",
    },
    {
      plan: "FREE",
      feature: "checkpoints",
      limitValue: 3,
      description: "Max active checkpoints",
    },
    {
      plan: "PILOT",
      feature: "seats",
      limitValue: 5,
      description: "Max active members",
    },
    {
      plan: "PILOT",
      feature: "inbound_messages",
      limitValue: 500,
      description: "Max inbound messages per month",
    },
    {
      plan: "PILOT",
      feature: "ai_monthly_budget",
      limitValue: 50,
      description: "AI usage budget (USD)",
    },
    {
      plan: "PILOT",
      feature: "integrations",
      limitValue: 2,
      description: "Max webhook integrations",
    },
    {
      plan: "PILOT",
      feature: "sourcing_runs",
      limitValue: 10,
      description: "Max active sourcing runs",
    },
    {
      plan: "PILOT",
      feature: "checkpoints",
      limitValue: 10,
      description: "Max active checkpoints",
    },
    {
      plan: "TEAM",
      feature: "seats",
      limitValue: 20,
      description: "Max active members",
    },
    {
      plan: "TEAM",
      feature: "inbound_messages",
      limitValue: 2000,
      description: "Max inbound messages per month",
    },
    {
      plan: "TEAM",
      feature: "ai_monthly_budget",
      limitValue: 200,
      description: "AI usage budget (USD)",
    },
    {
      plan: "TEAM",
      feature: "integrations",
      limitValue: 5,
      description: "Max webhook integrations",
    },
    {
      plan: "TEAM",
      feature: "sourcing_runs",
      limitValue: 50,
      description: "Max active sourcing runs",
    },
    {
      plan: "TEAM",
      feature: "checkpoints",
      limitValue: 50,
      description: "Max active checkpoints",
    },
    {
      plan: "ASSOCIATION",
      feature: "seats",
      limitValue: 100,
      description: "Max active members",
    },
    {
      plan: "ASSOCIATION",
      feature: "inbound_messages",
      limitValue: 10000,
      description: "Max inbound messages per month",
    },
    {
      plan: "ASSOCIATION",
      feature: "ai_monthly_budget",
      limitValue: 1000,
      description: "AI usage budget (USD)",
    },
    {
      plan: "ASSOCIATION",
      feature: "integrations",
      limitValue: 10,
      description: "Max webhook integrations",
    },
    {
      plan: "ASSOCIATION",
      feature: "sourcing_runs",
      limitValue: 200,
      description: "Max active sourcing runs",
    },
    {
      plan: "ASSOCIATION",
      feature: "checkpoints",
      limitValue: 200,
      description: "Max active checkpoints",
    },
  ];

  for (const pl of planLimits) {
    await prisma.planLimit.upsert({
      where: { plan_feature: { plan: pl.plan as any, feature: pl.feature } },
      update: { limitValue: pl.limitValue, description: pl.description },
      create: {
        plan: pl.plan as any,
        feature: pl.feature,
        limitValue: pl.limitValue,
        unit: "count",
        description: pl.description,
      },
    });
  }

  console.log(`  Seeded ${planLimits.length} plan limits`);
}

async function main() {
  console.log("Seeding permissions and roles...");
  await seedPermissions();

  console.log("Seeding plan limits...");
  await seedPlanLimits();

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

  await seedPlanLimits();

  // Demo Supplier Switch org — role accounts for pilot walkthrough (#99)
  const switchOrg = await prisma.organization.upsert({
    where: { id: "demo-supplier-switch-org" },
    update: {},
    create: {
      id: "demo-supplier-switch-org",
      name: "Demo Supplier Switch Organization",
      type: "ASSOCIATION",
      country: "Vietnam",
    },
  });

  const demoAccounts: {
    email: string;
    name: string;
    role: "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
    roleId: string;
  }[] = [
    {
      email: "owner-demo@tradeos.local",
      name: "Demo Owner",
      role: "OWNER",
      roleId: "system-owner",
    },
    {
      email: "admin-demo@tradeos.local",
      name: "Demo Admin",
      role: "ADMIN",
      roleId: "system-admin",
    },
    {
      email: "operator-demo@tradeos.local",
      name: "Demo Operator",
      role: "OPERATOR",
      roleId: "system-operator",
    },
    {
      email: "viewer-demo@tradeos.local",
      name: "Demo Viewer",
      role: "VIEWER",
      roleId: "system-viewer",
    },
    {
      email: "buyer-demo@tradeos.local",
      name: "Demo Buyer Reviewer",
      role: "VIEWER",
      roleId: "system-buyer_reviewer",
    },
  ];

  for (const acct of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {},
      create: {
        organizationId: switchOrg.id,
        email: acct.email,
        name: acct.name,
        role: acct.role,
      },
    });

    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: switchOrg.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: switchOrg.id,
        roleId: acct.roleId,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    console.log(
      `  Seeded demo user "${acct.name}" <${acct.email}> with role ${acct.role}`,
    );
  }

  // ─── Pilot Sourcing Run: Coffee Beans (Vietnam → Singapore) ──────────────
  // This creates a complete end-to-end scenario for demo walkthroughs.
  // The run is in REPORT_DELIVERED status so the buyer can view and decide.

  const operatorUser = await prisma.user.findUnique({
    where: { email: "operator-demo@tradeos.local" },
  });
  const buyerUser = await prisma.user.findUnique({
    where: { email: "buyer-demo@tradeos.local" },
  });
  const buyerEmail = "buyer-demo@tradeos.local";

  const pilotRun = await prisma.sourcingRun.upsert({
    where: { id: "pilot-coffee-bean-run" },
    update: {},
    create: {
      id: "pilot-coffee-bean-run",
      organizationId: switchOrg.id,
      title: "Robusta Coffee Bean Sourcing — Vietnam to Singapore",
      requirement: [
        "Buyer/Operator: Demo Operator",
        "Product: Premium Robusta coffee beans, grade 1, screen 16, moisture max 12.5%",
        "Current Supplier: Saigon Coffee Export Co.",
        "Current Price: USD 4,800/MT FOB HCMC",
        "Quantity: 500 MT/month",
        "Frequency: Monthly",
        "Pain: Overpaying / Price Gap, Single Supplier Dependency, Missing Price Evidence",
        "Pain Detail: Current supplier raised price by 18% in last 6 months. No alternative quotes on file. Suspecting we are paying above market rate.",
        "Evidence: Historical invoices from 2025 showing USD 4,050/MT. No recent competitor quotes received.",
        "Decision Authority: FULL_AUTHORITY — CEO delegated sourcing decisions to procurement team.",
        "Expected Outcome: Find 2-3 verified Robusta suppliers with quotes under USD 4,500/MT FOB, confirm landed cost to Singapore, negotiate or switch.",
      ].join("\n"),
      status: "REPORT_DELIVERED",
      targetCountry: "Singapore",
      sourceCountry: "Vietnam",
      productCategory: "Agriculture/Coffee",
      quantity: "500 MT/month",
      budget: "2500000",
      currency: "USD",
      riskLevel: "HIGH",
      createdById: operatorUser!.id,
    },
  });

  // Baseline — current supplier details
  await prisma.purchaseBaseline.upsert({
    where: { id: "pilot-baseline-001" },
    update: {},
    create: {
      id: "pilot-baseline-001",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      supplierName: "Saigon Coffee Export Co.",
      sourceType: "INVOICE",
      productDescription:
        "Premium Robusta coffee beans, grade 1, screen 16, moisture max 12.5%",
      quantity: "500",
      unit: "MT",
      unitPrice: "4800",
      currency: "USD",
      frequency: "Monthly",
      paymentTerms: "L/C at sight, 30 days after B/L",
      deliveryTerms: "FOB Ho Chi Minh",
      leadTime: "14 days from LC issuance",
      minOrderQty: "100 MT",
      riskFlags: [
        "PRICE_UP_18%_IN_6M",
        "NO_COMPETITIVE_QUOTES",
        "SINGLE_SUPPLIER_DEPENDENCY",
      ],
      leakageScore: 18,
      marketPrice: "4200",
    },
  });

  // Supplier candidates
  const candidate1 = await prisma.supplierCandidate.upsert({
    where: { id: "pilot-candidate-central" },
    update: {},
    create: {
      id: "pilot-candidate-central",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      name: "Central Highlands Beans Co., Ltd",
      source: "Alibaba verified supplier",
      website: "https://centralhighlandsbeans.example.vn",
      platform: "Alibaba",
      country: "Vietnam",
      contactInfo: {
        contact: "Mr. Nguyen Van A",
        phone: "+84 912 345 678",
        email: "nguyenvana@chbeans.example.vn",
      },
      reliabilityScore: 85,
      riskFlags: ["NEW_SUPPLIER", "NO_PREVIOUS_TRADE"],
    },
  });

  const candidate2 = await prisma.supplierCandidate.upsert({
    where: { id: "pilot-candidate-daklak" },
    update: {},
    create: {
      id: "pilot-candidate-daklak",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      name: "Daklak Premium Coffee Export",
      source: "Trade show introduction",
      website: "https://daklakcoffee.example.vn",
      platform: "Direct",
      country: "Vietnam",
      contactInfo: {
        contact: "Ms. Tran Thi B",
        phone: "+84 913 456 789",
        email: "tranthib@daklakcoffee.example.vn",
      },
      reliabilityScore: 72,
      riskFlags: JSON.stringify([
        "NEW_SUPPLIER",
        "SMALLER_CAPACITY",
        "NO_EXPORT_HISTORY",
      ]),
    },
  });

  // Alternative 1 — from Central Highlands
  await prisma.supplierAlternative.upsert({
    where: { id: "pilot-alt-central" },
    update: {},
    create: {
      id: "pilot-alt-central",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      supplierName: "Central Highlands Beans Co., Ltd",
      supplierCandidateId: candidate1.id,
      productDescription:
        "Premium Robusta coffee beans, grade 1, screen 16, moisture max 12.5%",
      quantity: "500",
      unit: "MT",
      unitPrice: "4100",
      currency: "USD",
      moq: "50 MT",
      leadTime: "10 days",
      paymentTerm: "30% deposit, 70% against B/L",
      warranty: "Quality guarantee: moisture <12.5%, defects <2%",
      shippingNotes: "FOB HCMC, container loading included",
      riskFlags: ["NEW_SUPPLIER"],
      estimatedSavings: 700,
      savingsConfidence: 70,
      switchingCost: "5000",
      switchingRisk: "LOW",
    },
  });

  // Alternative 2 — from Daklak
  await prisma.supplierAlternative.upsert({
    where: { id: "pilot-alt-daklak" },
    update: {},
    create: {
      id: "pilot-alt-daklak",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      supplierName: "Daklak Premium Coffee Export",
      supplierCandidateId: candidate2.id,
      productDescription: "Premium Robusta coffee beans, grade 1, screen 16",
      quantity: "200",
      unit: "MT",
      unitPrice: "3950",
      currency: "USD",
      moq: "100 MT",
      leadTime: "20 days",
      paymentTerm: "50% deposit, 50% against B/L",
      shippingNotes: "FOB HCMC",
      riskFlags: ["SMALLER_CAPACITY", "NEW_SUPPLIER", "LONGER_LEAD_TIME"],
      estimatedSavings: 850,
      savingsConfidence: 40,
      switchingCost: "8000",
      switchingRisk: "MEDIUM",
    },
  });

  // Quotes from candidates
  await prisma.supplierQuote.upsert({
    where: { id: "pilot-quote-central" },
    update: {},
    create: {
      id: "pilot-quote-central",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      supplierCandidateId: candidate1.id,
      productDescription: "Robusta coffee beans grade 1, screen 16",
      quantity: 500,
      unit: "MT",
      unitPrice: 4100,
      totalAmount: 2050000,
      currency: "USD",
      moq: "50 MT",
      leadTime: "10 days",
      shippingTerm: "FOB Ho Chi Minh",
      paymentTerm: "30% deposit, 70% against B/L",
      riskScore: 15,
    },
  });

  await prisma.supplierQuote.upsert({
    where: { id: "pilot-quote-daklak" },
    update: {},
    create: {
      id: "pilot-quote-daklak",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      supplierCandidateId: candidate2.id,
      productDescription: "Robusta coffee beans grade 1, screen 16",
      quantity: 200,
      unit: "MT",
      unitPrice: 3950,
      totalAmount: 790000,
      currency: "USD",
      moq: "100 MT",
      leadTime: "20 days",
      shippingTerm: "FOB Ho Chi Minh",
      paymentTerm: "50% deposit, 50% against B/L",
      riskScore: 30,
    },
  });

  // Evidence items
  await prisma.evidenceItem.upsert({
    where: { id: "pilot-evidence-invoice" },
    update: {},
    create: {
      id: "pilot-evidence-invoice",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      relatedType: "SOURCING_RUN",
      evidenceType: "CURRENT_SUPPLIER_INVOICE",
      title: "Saigon Coffee Export — Invoice Dec 2025",
      description:
        "Historical invoice showing USD 4,050/MT before 18% price hike",
      content:
        "INV-2025-12-001: 500MT Robusta beans @ USD 4,050/MT, total USD 2,025,000. Dated Dec 15, 2025.",
      capturedBy: operatorUser!.id,
    },
  });

  await prisma.evidenceItem.upsert({
    where: { id: "pilot-evidence-alternative-quote" },
    update: {},
    create: {
      id: "pilot-evidence-alternative-quote",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      relatedType: "SOURCING_RUN",
      evidenceType: "ALTERNATIVE_QUOTE",
      title: "Central Highlands Beans — Quotation Q-2026-001",
      description: "Competitive quote at USD 4,100/MT FOB HCMC",
      content:
        "QUOT-2026-001: 500MT Robusta beans @ USD 4,100/MT, total USD 2,050,000. Valid until Aug 2026.",
      capturedBy: operatorUser!.id,
    },
  });

  await prisma.evidenceItem.upsert({
    where: { id: "pilot-evidence-market-price" },
    update: {},
    create: {
      id: "pilot-evidence-market-price",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      relatedType: "SOURCING_RUN",
      evidenceType: "MARKET_BENCHMARK",
      title: "Market price reference — Robusta benchmark Jun 2026",
      description: "ICE Robusta futures + Vietnam FOB premium",
      content:
        "ICE Robusta Sep 2026: $4,150/MT. Vietnam FOB premium: $50-100/MT. Fair market range: $4,100-4,250/MT.",
      capturedBy: operatorUser!.id,
    },
  });

  // Switch Decision Report — generated outcome: NEGOTIATE
  await prisma.switchDecisionReport.upsert({
    where: { id: "pilot-switch-decision" },
    update: {},
    create: {
      id: "pilot-switch-decision",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      recommendation: "NEGOTIATE",
      confidence: "HIGH",
      savingsScore: 85,
      evidenceScore: 60,
      paymentRiskScore: 20,
      leadTimeRiskScore: 15,
      dependencyRiskScore: 40,
      overallScore: 72,
      monthlySavings: 291666, // (4800 - 4100) * 500 / 12 * 0.1 adjustment for rounding
      annualSavings: 3500000,
      savingsPercent: 14.6,
      currency: "USD",
      baselineId: "pilot-baseline-001",
      topAlternativeId: "pilot-alt-central",
      evidenceSummary: [
        "Historical invoice at USD 4,050/MT (Dec 2025)",
        "Competitive quote at USD 4,100/MT from Central Highlands Beans",
        "Market price reference shows fair range USD 4,100-4,250/MT",
      ],
      missingProof: ["NEEDS_ORIGIN_PRICE", "NEEDS_CURRENT_QUOTE"],
      riskFlags: ["SINGLE_SUPPLIER", "NO_LANDED_COST"],
      summary:
        "Current supplier Saigon Coffee Export Co. has raised prices 18% above market. Alternative supplier Central Highlands Beans quotes USD 4,100/MT — 14.6% below current price. Evidence quality is moderate (60/100) with missing origin price and current competitive quotes. Recommendation: negotiate with current supplier first using the alternative quote as leverage. If negotiation fails, switch to Central Highlands.",
      nextActions: [
        "1. Present Central Highlands quote to Saigon Coffee Export as leverage",
        "2. Request updated quote from Saigon with target price USD 4,200/MT",
        "3. Request origin price breakdown (farmgate vs export margin)",
        "4. Confirm landed cost to Singapore including freight and insurance",
        "5. If no improvement in 2 weeks, proceed with Central Highlands trial order",
      ],
    },
  });

  // Buyer report delivery — assigned to buyer-demo@tradeos.local
  await prisma.buyerReportDelivery.upsert({
    where: { id: "pilot-delivery" },
    update: {},
    create: {
      id: "pilot-delivery",
      organizationId: switchOrg.id,
      sourcingRunId: pilotRun.id,
      assignedToEmail: buyerEmail,
      assignedById: operatorUser!.id,
      status: "PENDING",
    },
  });

  console.log(
    `  Seeded pilot sourcing run "${pilotRun.title}" → assigned to ${buyerEmail}`,
  );

  console.log(
    "Seed completed for organizations:",
    organization.id,
    switchOrg.id,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

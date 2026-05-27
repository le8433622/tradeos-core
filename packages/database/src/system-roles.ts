import type { PrismaClient } from "@prisma/client";

export const SYSTEM_ROLE_IDS = {
  OWNER: "system-owner",
  ADMIN: "system-admin",
  SALES: "system-sales",
  OPERATOR: "system-operator",
  VIEWER: "system-viewer",
  BUYER_REVIEWER: "system-buyer_reviewer",
} as const;

type PermissionDef = {
  key: string;
  name: string;
  description: string;
  group: string;
};

type RoleDef = {
  name: string;
  description: string;
  permissions: string[];
};

export const SYSTEM_PERMISSIONS: PermissionDef[] = [
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
  {
    key: "audit.read",
    name: "Read audit logs",
    description: "View and export audit logs",
    group: "audit",
  },
  {
    key: "integration.manage",
    name: "Manage integrations",
    description: "Configure webhook integrations",
    group: "integration",
  },
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

const SYSTEM_ROLES: RoleDef[] = [
  {
    name: "OWNER",
    description:
      "Full access to all features, billing, security, user management, raw evidence, publishing, and outcomes",
    permissions: SYSTEM_PERMISSIONS.map((p) => p.key),
  },
  {
    name: "ADMIN",
    description:
      "Operational administration without owner-only security and billing changes",
    permissions: SYSTEM_PERMISSIONS.filter(
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
      "Runs sourcing cases without publishing reports, billing approval, payments, or role changes",
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
    description:
      "Internal read-only access without mutation or raw evidence by default",
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

export async function ensureSystemRoles(client: PrismaClient) {
  const permissionMap: Record<string, string> = {};

  for (const permission of SYSTEM_PERMISSIONS) {
    const record = await client.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
        group: permission.group,
      },
      create: permission,
    });
    permissionMap[permission.key] = record.id;
  }

  for (const roleDef of SYSTEM_ROLES) {
    const roleId = `system-${roleDef.name.toLowerCase()}`;
    const role = await client.role.upsert({
      where: { id: roleId },
      update: { name: roleDef.name, description: roleDef.description },
      create: {
        id: roleId,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });

    for (const permissionKey of roleDef.permissions) {
      const permissionId = permissionMap[permissionKey];
      if (!permissionId) continue;
      await client.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}

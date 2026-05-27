import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

const MODULE_GROUPS: Record<string, string> = {
  lead: "Lead",
  company: "Company",
  contact: "Contact",
  quotation: "Quotation",
  product: "Product",
  message: "Message",
  sourcing: "Sourcing",
  approval: "Approval",
  billing: "Billing",
  user: "User Management",
  organization: "Organization",
  privacy: "Privacy",
  report: "Report",
  integration: "Integration",
  webhook: "Webhook",
  audit: "Audit",
  ai: "AI",
  introduction: "Introduction",
  notification: "Notification",
  task: "Task",
  settings: "Settings",
};

function getModule(key: string): string {
  const parts = key.split(".");
  return MODULE_GROUPS[parts[0]] ?? parts[0];
}

export default async function RolesSettingsPage() {
  const session = await requirePagePermission("settings.profile");
  const roles = await prisma.role.findMany({
    where: { isSystem: true },
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });

  const allPermissionKeys = new Set<string>();
  for (const role of roles) {
    for (const rp of role.permissions) {
      allPermissionKeys.add(rp.permission.key);
    }
  }

  const sortedKeys = Array.from(allPermissionKeys).sort();
  const grouped: Record<string, string[]> = {};
  for (const key of sortedKeys) {
    const mod = getModule(key);
    if (!grouped[mod]) grouped[mod] = [];
    grouped[mod].push(key);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>
        Role & Permission Matrix
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Shows which permissions each system role has. Owner has all permissions.
      </p>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <th
                style={{
                  padding: "10px 16px",
                  fontWeight: 600,
                  textAlign: "left",
                  color: "#374151",
                  position: "sticky",
                  left: 0,
                  background: "#f9fafb",
                  minWidth: 220,
                }}
              >
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    textAlign: "center",
                    color: "#374151",
                    minWidth: 100,
                  }}
                >
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([module, keys], mi) => (
              <>
                <tr
                  key={`header-${module}`}
                  style={{
                    background: "#f3f4f6",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td
                    colSpan={roles.length + 1}
                    style={{
                      padding: "6px 16px",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {module}
                  </td>
                </tr>
                {keys.map((key) => (
                  <tr
                    key={key}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: mi % 2 === 0 ? "#fff" : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 16px",
                        color: "#374151",
                        fontFamily: "monospace",
                        fontSize: 12,
                        position: "sticky",
                        left: 0,
                        background: mi % 2 === 0 ? "#fff" : "#f9fafb",
                      }}
                    >
                      {key}
                    </td>
                    {roles.map((role) => {
                      const hasIt = role.permissions.some(
                        (rp) => rp.permission.key === key,
                      );
                      return (
                        <td
                          key={role.id}
                          style={{
                            padding: "8px 16px",
                            textAlign: "center",
                            color: hasIt ? "#16a34a" : "#d1d5db",
                          }}
                        >
                          {hasIt ? "✓" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

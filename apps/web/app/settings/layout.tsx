import { requirePageSession } from "../../lib/page-session";

const SIDEBAR_ITEMS: { label: string; href: string; permission: string }[] = [
  {
    label: "Profile",
    href: "/settings/profile",
    permission: "settings.profile",
  },
  { label: "Team", href: "/settings/team", permission: "user.invite" },
  { label: "Roles", href: "/settings/roles", permission: "settings.profile" },
  {
    label: "Security",
    href: "/settings/security",
    permission: "settings.security",
  },
  { label: "Billing", href: "/settings/billing", permission: "billing.read" },
  { label: "Privacy", href: "/settings/privacy", permission: "privacy.export" },
  {
    label: "Integrations",
    href: "/settings/integrations",
    permission: "integration.manage",
  },
  { label: "AI", href: "/settings/ai", permission: "ai.budgetManage" },
  {
    label: "Notifications",
    href: "/settings/notifications",
    permission: "notification.manage",
  },
  { label: "Audit", href: "/settings/audit", permission: "audit.read" },
  {
    label: "Debug",
    href: "/settings/debug",
    permission: "settings.profile",
  },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();
  const perms = session.permissions ?? [];

  return (
    <div
      style={{
        display: "flex",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <nav
        style={{
          width: 240,
          padding: 24,
          borderRight: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            margin: "0 0 16px",
          }}
        >
          Organization Settings
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {SIDEBAR_ITEMS.map((item) => {
            const allowed = perms.includes(item.permission);
            return (
              <li key={item.href} style={{ marginBottom: 4 }}>
                <a
                  href={item.href}
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    color: allowed ? "#374151" : "#9ca3af",
                    textDecoration: "none",
                    cursor: allowed ? "pointer" : "not-allowed",
                    pointerEvents: allowed ? undefined : "none",
                  }}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}

import { requirePagePermission } from "../../../lib/page-session";
import { prisma } from "@tradeos/database";

export default async function DebugSettingsPage() {
  const session = await requirePagePermission("settings.profile");

  const [allPermissions, orgInfo] = await Promise.all([
    prisma.permission.findMany({
      orderBy: { key: "asc" },
      select: { key: true, name: true },
    }),
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Permission Debug</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Section title="Session">
          <Row label="User ID" value={session.userId} />
          <Row label="Email" value={session.email} />
          <Row
            label="Organization"
            value={`${orgInfo?.name ?? "—"} (${session.organizationId})`}
          />
          <Row label="Role" value={session.role} />
          <Row label="Auth Provider" value={session.authProvider} />
          <Row label="MFA Level" value={session.mfaLevel} />
        </Section>

        <Section title="Memberships">
          {session.memberships.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Org ID
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {session.memberships.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td
                      style={{
                        padding: "6px 8px",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {m.organizationId}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{m.organizationName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 13, color: "#6b7280" }}>No memberships</p>
          )}
        </Section>
      </div>

      <Section
        title={`Permissions (${allPermissions.length} total, ${session.permissions.length} granted)`}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 4,
          }}
        >
          {allPermissions.map((p) => {
            const allowed = session.permissions.includes(p.key);
            return (
              <div
                key={p.key}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "monospace",
                  background: allowed ? "#f0fdf4" : "#f9fafb",
                  color: allowed ? "#16a34a" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ flexShrink: 0 }}>{allowed ? "✓" : "—"}</span>
                <span>{p.key}</span>
                <span
                  style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          margin: "0 0 12px",
          color: "#374151",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "#374151",
          maxWidth: "60%",
          wordBreak: "break-all",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

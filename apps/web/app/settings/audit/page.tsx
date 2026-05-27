import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

const RISK_COLORS: Record<string, string> = {
  LOW: "#16a34a",
  MEDIUM: "#ca8a04",
  HIGH: "#dc2626",
  CRITICAL: "#991b1b",
};

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        color: "#fff",
        background: RISK_COLORS[risk] ?? "#6b7280",
      }}
    >
      {risk}
    </span>
  );
}

export default async function AuditSettingsPage() {
  const session = await requirePagePermission("audit.read");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Audit Logs</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Last {logs.length} actions recorded for your organization.
        {logs.length === 0 && " No audit events yet."}
      </p>

      {logs.length > 0 && (
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
                  }}
                >
                  Action
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    textAlign: "left",
                    color: "#374151",
                  }}
                >
                  Actor
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    textAlign: "left",
                    color: "#374151",
                  }}
                >
                  Risk
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    textAlign: "left",
                    color: "#374151",
                  }}
                >
                  Approved
                </th>
                <th
                  style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    textAlign: "left",
                    color: "#374151",
                  }}
                >
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {log.actionName}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {log.actor?.name ?? log.actor?.email ?? "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <RiskBadge risk={log.riskLevel} />
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {log.approved ? (
                      <span style={{ color: "#16a34a", fontWeight: 500 }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>No</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

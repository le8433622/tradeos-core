import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";

const statusColors: Record<string, string> = {
  DRAFT: "#fef3c7",
  APPROVED: "#d1fae5",
  SENT: "#dbeafe",
  ARCHIVED: "#f3f4f6",
};

const statusTextColors: Record<string, string> = {
  DRAFT: "#92400e",
  APPROVED: "#065f46",
  SENT: "#1e40af",
  ARCHIVED: "#374151",
};

export default async function ReportsPage() {
  const session = await requirePagePermission("report.generate");
  const snapshots = await prisma.reportSnapshot.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      approvedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "24px", margin: 0 }}>Reports</h1>
        <form action="/api/reports/snapshots" method="POST">
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Generate Weekly Snapshot
          </button>
        </form>
      </div>

      {snapshots.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6b7280",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          No report snapshots yet. Generate your first weekly snapshot.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}
            >
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>Period</th>
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>Type</th>
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>
                Approved By
              </th>
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>Created</th>
              <th style={{ padding: "12px 8px", fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px 8px" }}>
                  {s.periodStart} — {s.periodEnd}
                </td>
                <td style={{ padding: "12px 8px" }}>{s.reportType}</td>
                <td style={{ padding: "12px 8px" }}>
                  <span
                    style={{
                      background: statusColors[s.status] ?? "#f3f4f6",
                      color: statusTextColors[s.status] ?? "#374151",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: "12px 8px" }}>
                  {s.approvedBy?.name ?? s.approvedBy?.email ?? "—"}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  {s.createdAt.toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <a
                    href={`/reports/${s.id}`}
                    style={{
                      color: "#2563eb",
                      textDecoration: "none",
                      marginRight: "12px",
                    }}
                  >
                    View
                  </a>
                  {s.status === "DRAFT" && (
                    <form
                      action={`/api/reports/snapshots/${s.id}/approve`}
                      method="POST"
                      style={{ display: "inline" }}
                    >
                      <button
                        type="submit"
                        style={{
                          padding: "4px 12px",
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Approve
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

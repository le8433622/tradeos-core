import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import "@tradeos/sourcing-core";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  READY_FOR_REVIEW: "#2563eb",
  IN_REVIEW: "#7c3aed",
  COMPARED: "#0891b2",
  READY_FOR_REPORT: "#ca8a04",
  REPORT_DELIVERED: "#059669",
  CANCELLED: "#dc2626",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        background: STATUS_COLORS[status] ?? "#6b7280",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function SourcingRunsPage() {
  const session = await requirePagePermission("sourcing.list");
  const runs = await prisma.sourcingRun.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: {
        select: {
          supplierCandidates: true,
          supplierQuotes: true,
          evidenceItems: true,
          checkpoints: true,
        },
      },
    },
  });

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Sourcing Runs</h1>
        <a
          href="/sourcing-runs/create"
          style={{
            background: "#111827",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + New Run
        </a>
      </div>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Manage supplier sourcing, quotation collection, and buyer reports
      </p>

      {runs.length === 0 ? (
        <EmptyState
          title="No sourcing runs yet"
          description="Create a sourcing run to start finding suppliers and collecting quotes."
          action={{ label: "Create Sourcing Run", href: "/sourcing-runs/create" }}
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12 }}>Title</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Suppliers</th>
                <th style={{ padding: 12 }}>Quotes</th>
                <th style={{ padding: 12 }}>Evidence</th>
                <th style={{ padding: 12 }}>Checkpoints</th>
                <th style={{ padding: 12 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    <a
                      href={`/sourcing-runs/${run.id}`}
                      style={{ color: "#0070f3", textDecoration: "none", fontWeight: 500 }}
                    >
                      {run.title}
                    </a>
                  </td>
                  <td style={{ padding: 12 }}>
                    <StatusBadge status={run.status} />
                  </td>
                  <td style={{ padding: 12 }}>{run._count.supplierCandidates}</td>
                  <td style={{ padding: 12 }}>{run._count.supplierQuotes}</td>
                  <td style={{ padding: 12 }}>{run._count.evidenceItems}</td>
                  <td style={{ padding: 12 }}>{run._count.checkpoints}</td>
                  <td style={{ padding: 12 }}>
                    {run.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

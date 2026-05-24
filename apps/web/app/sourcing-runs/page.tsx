import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";
import "@tradeos/sourcing-core";

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
      <h1>Sourcing Runs</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Manage supplier sourcing, quotation collection, and buyer reports
      </p>

      {runs.length === 0 ? (
        <EmptyState
          title="No sourcing runs yet"
          description="Create a sourcing run to start finding suppliers and collecting quotes."
        />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                    style={{ color: "#0070f3", textDecoration: "none" }}
                  >
                    {run.title}
                  </a>
                </td>
                <td style={{ padding: 12 }}>{run.status}</td>
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
      )}
    </main>
  );
}

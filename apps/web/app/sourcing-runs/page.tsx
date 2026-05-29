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

export default async function SourcingRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePagePermission("sourcing.list");
  const { status: filterStatus } = await searchParams;

  const where: Record<string, unknown> = {
    organizationId: session.organizationId,
  };
  if (filterStatus) {
    where.status = filterStatus;
  }

  const runs = await prisma.sourcingRun.findMany({
    where,
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

  const allStatuses = [
    "DRAFT",
    "READY_FOR_REVIEW",
    "IN_REVIEW",
    "COMPARED",
    "READY_FOR_REPORT",
    "REPORT_DELIVERED",
    "CANCELLED",
  ];

  const reportDecisions =
    runs.length > 0
      ? await prisma.switchDecisionReport.groupBy({
          by: ["sourcingRunId"],
          where: {
            organizationId: session.organizationId,
            sourcingRunId: { in: runs.map((r) => r.id) },
          },
          _max: { buyerDecision: true, buyerDecidedAt: true },
        })
      : [];

  const decisionMap = new Map(
    reportDecisions.map((d) => [
      d.sourcingRunId,
      { decision: d._max.buyerDecision, decidedAt: d._max.buyerDecidedAt },
    ]),
  );

  const outcomeRunIds =
    runs.length > 0
      ? (
          await prisma.outcomeRecord.findMany({
            where: {
              organizationId: session.organizationId,
              sourcingRunId: { in: runs.map((r) => r.id) },
            },
            select: { sourcingRunId: true },
          })
        ).map((o) => o.sourcingRunId)
      : [];

  const outcomeSet = new Set(outcomeRunIds);

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

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <a
          href="/sourcing-runs"
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 13,
            textDecoration: "none",
            fontWeight: filterStatus ? 400 : 600,
            background: filterStatus ? "#f3f4f6" : "#111827",
            color: filterStatus ? "#374151" : "#fff",
          }}
        >
          All
        </a>
        {allStatuses.map((s) => (
          <a
            key={s}
            href={`/sourcing-runs?status=${s}`}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              textDecoration: "none",
              fontWeight: filterStatus === s ? 600 : 400,
              background: filterStatus === s ? STATUS_COLORS[s] : "#f3f4f6",
              color: filterStatus === s ? "#fff" : "#374151",
            }}
          >
            {s.replace(/_/g, " ")}
          </a>
        ))}
      </div>

      {runs.length === 0 ? (
        <EmptyState
          title={
            filterStatus ? "No runs match this status" : "No sourcing runs yet"
          }
          description={
            filterStatus
              ? `No runs with status "${filterStatus}". Try a different filter.`
              : "Create a sourcing run to start finding suppliers and collecting quotes."
          }
          action={
            filterStatus
              ? { label: "Clear filter", href: "/sourcing-runs" }
              : { label: "Create Sourcing Run", href: "/sourcing-runs/create" }
          }
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 700,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 12 }}>Title</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Decision</th>
                <th style={{ padding: 12 }}>Outcome</th>
                <th style={{ padding: 12 }}>Suppliers</th>
                <th style={{ padding: 12 }}>Quotes</th>
                <th style={{ padding: 12 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const decision = decisionMap.get(run.id);
                const hasOutcome = outcomeSet.has(run.id);
                const isStale =
                  decision?.decision === "APPROVED" &&
                  !hasOutcome &&
                  decision?.decidedAt &&
                  (Date.now() - new Date(decision.decidedAt).getTime()) /
                    (1000 * 60 * 60 * 24) >=
                    14;

                return (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: "1px solid #eee",
                      background: isStale ? "#fef2f2" : undefined,
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      <a
                        href={`/sourcing-runs/${run.id}`}
                        style={{
                          color: "#0070f3",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        {run.title}
                      </a>
                    </td>
                    <td style={{ padding: 12 }}>
                      <StatusBadge status={run.status} />
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {decision?.decision ? (
                        <span
                          style={{
                            color:
                              decision.decision === "APPROVED"
                                ? "#059669"
                                : decision.decision === "REJECTED"
                                  ? "#dc2626"
                                  : "#ca8a04",
                            fontWeight: 500,
                          }}
                        >
                          {decision.decision.replace(/_/g, " ")}
                          {isStale && (
                            <span
                              style={{
                                display: "inline-block",
                                marginLeft: 6,
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                background: "#dc2626",
                                color: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              STALE
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {hasOutcome ? (
                        <a
                          href={`/sourcing-runs/${run.id}/outcome`}
                          style={{
                            color: "#059669",
                            fontSize: 13,
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                        >
                          Recorded
                        </a>
                      ) : decision?.decision ? (
                        <a
                          href={`/sourcing-runs/${run.id}/outcome`}
                          style={{
                            color: "#9ca3af",
                            fontSize: 13,
                            textDecoration: "none",
                          }}
                        >
                          Record &rarr;
                        </a>
                      ) : (
                        <span style={{ color: "#d1d5db", fontSize: 13 }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, fontSize: 14 }}>
                      {run._count.supplierCandidates}
                    </td>
                    <td style={{ padding: 12, fontSize: 14 }}>
                      {run._count.supplierQuotes}
                    </td>
                    <td style={{ padding: 12, fontSize: 14, color: "#6b7280" }}>
                      {run.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

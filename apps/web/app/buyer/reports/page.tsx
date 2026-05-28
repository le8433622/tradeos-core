import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import "@tradeos/sourcing-core";

export default async function BuyerReportsPage() {
  const session = await requirePagePermission("buyerReport.view_assigned");

  const deliveries = await prisma.buyerReportDelivery.findMany({
    where: {
      assignedToEmail: session.email,
      organizationId: session.organizationId,
    },
    orderBy: { deliveredAt: "desc" },
    take: 50,
  });

  const runIds = deliveries.map((d) => d.sourcingRunId);
  const runs =
    runIds.length > 0
      ? await prisma.sourcingRun.findMany({
          where: { id: { in: runIds } },
          select: {
            id: true,
            title: true,
            requirement: true,
            targetCountry: true,
            sourceCountry: true,
            status: true,
            createdAt: true,
          },
        })
      : [];

  const runMap = new Map(runs.map((r) => [r.id, r]));

  const reports =
    runIds.length > 0
      ? await prisma.switchDecisionReport.findMany({
          where: { sourcingRunId: { in: runIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["sourcingRunId"],
          select: {
            sourcingRunId: true,
            recommendation: true,
            confidence: true,
            savingsPercent: true,
            currency: true,
            buyerDecision: true,
            summary: true,
            monthlySavings: true,
            annualSavings: true,
          },
        })
      : [];

  const reportMap = new Map(reports.map((r) => [r.sourcingRunId, r]));

  return (
    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <span
        style={{
          borderRadius: 999,
          background: "#ecfeff",
          color: "#155e75",
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Buyer reviewer
      </span>
      <h1 style={{ fontSize: 32, margin: "16px 0 8px" }}>
        Assigned Buyer Reports
      </h1>
      <p style={{ color: "#6b7280", maxWidth: 720 }}>
        Signed in as {session.email}. This role can only see buyer reports
        explicitly assigned to this email and buyer-safe evidence summaries.
      </p>

      {deliveries.length === 0 ? (
        <section
          style={{
            marginTop: 24,
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            background: "white",
          }}
        >
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>
            No assigned reports
          </h2>
          <p style={{ color: "#6b7280", margin: 0 }}>
            When an internal team publishes a buyer-safe Supplier Switch report
            to you, it will appear here.
          </p>
        </section>
      ) : (
        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          {deliveries.map((d) => {
            const run = runMap.get(d.sourcingRunId);
            const report = reportMap.get(d.sourcingRunId);
            return (
              <a
                key={d.id}
                href={`/buyer/reports/${d.sourcingRunId}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 24,
                  background: "white",
                  display: "block",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 18, margin: 0 }}>
                      {run?.title ?? "Unknown"}
                    </h2>
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: 13,
                        margin: "4px 0 0",
                      }}
                    >
                      {run?.requirement?.slice(0, 200)}
                      {(run?.requirement?.length ?? 0) > 200 ? "..." : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          d.status === "PENDING"
                            ? "#fef3c7"
                            : d.status === "VIEWED"
                              ? "#dbeafe"
                              : "#d1fae5",
                        color:
                          d.status === "PENDING"
                            ? "#92400e"
                            : d.status === "VIEWED"
                              ? "#1e40af"
                              : "#065f46",
                      }}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>

                {report && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 24,
                      fontSize: 13,
                      color: "#374151",
                    }}
                  >
                    <div>
                      <span style={{ color: "#9ca3af" }}>Recommendation:</span>{" "}
                      <strong
                        style={{
                          color:
                            report.recommendation === "SWITCH"
                              ? "#059669"
                              : report.recommendation === "NEGOTIATE"
                                ? "#ca8a04"
                                : report.recommendation ===
                                    "INSUFFICIENT_EVIDENCE"
                                  ? "#6b7280"
                                  : "#dc2626",
                        }}
                      >
                        {report.recommendation}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#9ca3af" }}>Confidence:</span>{" "}
                      <strong>{report.confidence}</strong>
                    </div>
                    {report.savingsPercent != null && (
                      <div>
                        <span style={{ color: "#9ca3af" }}>Savings:</span>{" "}
                        <strong>
                          {Number(report.savingsPercent).toFixed(1)}%
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: "#9ca3af" }}>Decision:</span>{" "}
                      <strong>{report.buyerDecision ?? "Pending"}</strong>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  Delivered{" "}
                  {d.deliveredAt.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {d.notes && ` · Note: ${d.notes}`}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}

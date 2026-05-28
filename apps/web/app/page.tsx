import { prisma } from "@tradeos/database";
import { requirePageSession } from "../lib/page-session";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>
        {value}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        {content}
      </a>
    );
  }

  return content;
}

function StatusBadge({ label, count }: { label: string; count: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        background: "#f3f4f6",
        color: "#374151",
      }}
    >
      {label}
      <span
        style={{
          background: "#d1d5db",
          color: "#111827",
          borderRadius: 999,
          padding: "1px 7px",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </span>
  );
}

export default async function DashboardPage() {
  const session = await requirePageSession();
  const orgId = session.organizationId;

  const [
    totalRuns,
    activeRuns,
    totalLeads,
    totalCompanies,
    pendingApprovals,
    members,
    decidedRuns,
    allOutcomeRunIds,
  ] = await Promise.all([
    prisma.sourcingRun.count({ where: { organizationId: orgId } }),
    prisma.sourcingRun.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.company.count({ where: { organizationId: orgId } }),
    prisma.approvalRequest.count({
      where: { organizationId: orgId, status: "PENDING" },
    }),
    prisma.organizationMember.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.switchDecisionReport.findMany({
      where: {
        organizationId: orgId,
        buyerDecision: { not: null },
      },
      select: {
        sourcingRunId: true,
        buyerDecision: true,
        buyerDecidedAt: true,
      },
      orderBy: { buyerDecidedAt: "desc" },
    }),
    prisma.outcomeRecord.findMany({
      where: { organizationId: orgId },
      select: { sourcingRunId: true },
      distinct: ["sourcingRunId"],
    }),
  ]);

  const outcomeRunIdSet = new Set(allOutcomeRunIds.map((o) => o.sourcingRunId));
  const pendingOutcomeRuns = decidedRuns.filter(
    (r) => !outcomeRunIdSet.has(r.sourcingRunId),
  );

  const recentRuns = await prisma.sourcingRun.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 960,
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, margin: 0, color: "#111827" }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Overview of your trade operations
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="Sourcing Runs"
          value={totalRuns}
          href="/sourcing-runs"
        />
        <StatCard
          label="Active Runs"
          value={activeRuns}
          href="/sourcing-runs"
        />
        <StatCard label="Leads" value={totalLeads} href="/leads" />
        <StatCard label="Companies" value={totalCompanies} href="/companies" />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals}
          href="/approvals"
        />
        <StatCard label="Team Members" value={members} href="/settings/team" />
        {pendingOutcomeRuns.length > 0 && (
          <a href="/sourcing-runs" style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 12,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
                Outcome Pending
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#991b1b" }}>
                {pendingOutcomeRuns.length}
              </div>
            </div>
          </a>
        )}
      </div>

      {pendingOutcomeRuns.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #fca5a5",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 16px",
              color: "#991b1b",
            }}
          >
            Outcome Pending
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "-8px 0 16px" }}>
            These runs have a buyer decision but no outcome recorded. Record
            outcome to close the learning loop.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {pendingOutcomeRuns.map((r) => (
              <li
                key={r.sourcingRunId}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <a
                    href={`/sourcing-runs/${r.sourcingRunId}/outcome`}
                    style={{
                      color: "#dc2626",
                      textDecoration: "none",
                      fontWeight: 500,
                      fontSize: 14,
                    }}
                  >
                    {r.sourcingRunId.slice(0, 8)}...
                  </a>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    Decided:{" "}
                    {r.buyerDecidedAt
                      ? new Date(r.buyerDecidedAt).toLocaleDateString()
                      : "?"}
                  </span>
                </div>
                <a
                  href={`/sourcing-runs/${r.sourcingRunId}/outcome`}
                  style={{
                    padding: "6px 14px",
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Record Outcome
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            margin: "0 0 16px",
            color: "#111827",
          }}
        >
          Recent Sourcing Runs
        </h2>

        {recentRuns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              No sourcing runs yet
            </div>
            <a
              href="/sourcing-runs/create"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "#111827",
                color: "white",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              + Create your first run
            </a>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <th style={{ textAlign: "left", padding: "8px 12px" }}>
                  Title
                </th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>
                  Status
                </th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, i) => (
                <tr
                  key={run.id}
                  style={{
                    borderTop: "1px solid #f3f4f6",
                    fontSize: 14,
                  }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <a
                      href={`/sourcing-runs/${run.id}`}
                      style={{
                        color: "#2563eb",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      {run.title}
                    </a>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge
                      label={
                        outcomeRunIdSet.has(run.id) ? "COMPLETE" : run.status
                      }
                      count={0}
                    />
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "#6b7280",
                    }}
                  >
                    {run.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

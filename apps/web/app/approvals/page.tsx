import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";

export default async function ApprovalsPage() {
  const session = await requirePagePermission("approval.review");
  const approvals = await prisma.approvalRequest.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      requestedBy: { select: { name: true, email: true } },
    },
  });

  const statusColors: Record<string, string> = {
    PENDING: "#fef3c7",
    APPROVED: "#dcfce7",
    REJECTED: "#fee2e2",
    EXECUTED: "#dbeafe",
    FAILED: "#f3f4f6",
  };

  const statusTextColors: Record<string, string> = {
    PENDING: "#92400e",
    APPROVED: "#166534",
    REJECTED: "#991b1b",
    EXECUTED: "#1e40af",
    FAILED: "#374151",
  };

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Approval Queue</h1>
      <p>
        Tenant: {session.organizationId}. AI or operators can request approval
        for high-risk actions. Click an item to review details.
      </p>

      {approvals.length === 0 ? (
        <EmptyState
          title="No approval requests yet"
          description="Approval requests are created when an AI action requires human review, or when an operator submits a high-risk action for approval."
        />
      ) : (
        approvals.map((approval) => (
          <a
            key={approval.id}
            href={`/approvals/${approval.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <article
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ fontSize: 16 }}>{approval.actionName}</strong>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: statusColors[approval.status] || "#f3f4f6",
                    color: statusTextColors[approval.status] || "#374151",
                  }}
                >
                  {approval.status}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
                Risk: {approval.riskLevel}
                {approval.reason && (
                  <>
                    {" "}
                    &middot; {approval.reason.slice(0, 80)}
                    {approval.reason.length > 80 ? "..." : ""}
                  </>
                )}
                &middot; {approval.createdAt.toLocaleDateString()}
                {approval.requestedBy && (
                  <>
                    {" "}
                    &middot; by{" "}
                    {approval.requestedBy.name || approval.requestedBy.email}
                  </>
                )}
              </p>
            </article>
          </a>
        ))
      )}
    </main>
  );
}

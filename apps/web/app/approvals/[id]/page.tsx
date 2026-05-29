import { notFound } from "next/navigation";
import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import { ApprovalActions } from "./ApprovalActions";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("approval.review");
  const { id } = await params;

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  if (!approval || approval.organizationId !== session.organizationId) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    PENDING: "#f59e0b",
    APPROVED: "#16a34a",
    REJECTED: "#dc2626",
    EXECUTED: "#2563eb",
    FAILED: "#6b7280",
  };

  const riskColors: Record<string, string> = {
    LOW: "#16a34a",
    MEDIUM: "#f59e0b",
    HIGH: "#dc2626",
    CRITICAL: "#991b1b",
  };

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 720 }}
    >
      <a href="/approvals" style={{ color: "#2563eb" }}>
        Back to approvals
      </a>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          marginTop: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>{approval.actionName}</h1>
          <p style={{ color: "#6b7280", marginTop: 4 }}>
            Created {approval.createdAt.toLocaleString()}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: statusColors[approval.status] || "#e5e7eb",
              color: "#fff",
            }}
          >
            {approval.status}
          </span>
          <span
            style={{
              display: "inline-block",
              marginLeft: 6,
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: riskColors[approval.riskLevel] || "#e5e7eb",
              color: "#fff",
            }}
          >
            {approval.riskLevel}
          </span>
        </div>
      </div>

      <section style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {approval.reason && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 14, margin: "0 0 4px", color: "#6b7280" }}>
              Reason
            </h3>
            <p style={{ margin: 0 }}>{approval.reason}</p>
          </div>
        )}

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: 14, margin: "0 0 4px", color: "#6b7280" }}>
            Input
          </h3>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>
            {JSON.stringify(approval.input, null, 2)}
          </pre>
        </div>

        {approval.result && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 14, margin: "0 0 4px", color: "#6b7280" }}>
              Result
            </h3>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>
              {JSON.stringify(approval.result, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: 24,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {approval.requestedBy && (
          <div>
            <strong style={{ fontSize: 13, color: "#6b7280" }}>
              Requested by
            </strong>
            <p style={{ margin: "2px 0" }}>
              {approval.requestedBy.name || approval.requestedBy.email}
            </p>
          </div>
        )}
        {approval.reviewedBy && (
          <div>
            <strong style={{ fontSize: 13, color: "#6b7280" }}>
              Reviewed by
            </strong>
            <p style={{ margin: "2px 0" }}>
              {approval.reviewedBy.name || approval.reviewedBy.email}
            </p>
          </div>
        )}
        {approval.reviewedAt && (
          <div>
            <strong style={{ fontSize: 13, color: "#6b7280" }}>
              Reviewed at
            </strong>
            <p style={{ margin: "2px 0" }}>
              {approval.reviewedAt.toLocaleString()}
            </p>
          </div>
        )}
        {approval.executedAt && (
          <div>
            <strong style={{ fontSize: 13, color: "#6b7280" }}>
              Executed at
            </strong>
            <p style={{ margin: "2px 0" }}>
              {approval.executedAt.toLocaleString()}
            </p>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <ApprovalActions approvalId={approval.id} status={approval.status} />
      </section>
    </main>
  );
}

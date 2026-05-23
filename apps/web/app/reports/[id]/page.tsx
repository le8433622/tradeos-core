import { notFound } from "next/navigation";
import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("report.generate");
  const { id } = await params;

  const snapshot = await prisma.reportSnapshot.findUnique({ where: { id } });
  if (!snapshot || snapshot.organizationId !== session.organizationId)
    notFound();

  const payload = snapshot.payload as Record<string, unknown>;

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "720px",
      }}
    >
      <a
        href="/reports"
        style={{
          color: "#2563eb",
          textDecoration: "none",
          display: "block",
          marginBottom: "16px",
        }}
      >
        ← Back to reports
      </a>
      <h1 style={{ fontSize: "24px", margin: "0 0 8px" }}>
        {snapshot.reportType.charAt(0).toUpperCase() +
          snapshot.reportType.slice(1)}{" "}
        Report
      </h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>
        {snapshot.periodStart} — {snapshot.periodEnd}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <MetricCard
          label="Inbound Volume"
          value={payload.inboundVolume as number}
        />
        <MetricCard
          label="Response Speed"
          value={payload.responseSpeedLabel as string}
        />
        <MetricCard
          label="Quotations Drafted"
          value={payload.quotationVolume as number}
        />
        <MetricCard
          label="Quotations Sent"
          value={payload.quotationSentVolume as number}
        />
        <MetricCard
          label="Stale Leads"
          value={payload.staleLeadCount as number}
        />
      </div>

      {Array.isArray(payload.topDemandCategories) &&
        (payload.topDemandCategories as { category: string; count: number }[])
          .length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>
              Top Demand Categories
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <th style={{ padding: "8px", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "8px", fontWeight: 600 }}>Mentions</th>
                </tr>
              </thead>
              <tbody>
                {(
                  payload.topDemandCategories as {
                    category: string;
                    count: number;
                  }[]
                ).map((item) => (
                  <tr
                    key={item.category}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "8px" }}>{item.category}</td>
                    <td style={{ padding: "8px" }}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>
        {payload.dataPrivacyNote as string}
      </p>
      <p style={{ fontSize: "13px", color: "#9ca3af" }}>
        Status: {snapshot.status} · Generated:{" "}
        {new Date(payload.generatedAt as string).toLocaleString()}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}
    >
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#6b7280" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>{value}</p>
    </div>
  );
}

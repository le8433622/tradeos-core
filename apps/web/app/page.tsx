import { SignOutButton } from "../components/sign-out-button";
import { requirePageSession } from "../lib/page-session";
import {
  getDashboardMetrics,
  generateWeeklyReport,
  getFunnelMetrics,
} from "@tradeos/analytics-core";

const links = [
  { href: "/leads", label: "Leads" },
  { href: "/companies", label: "Companies" },
  { href: "/conversations", label: "Conversations" },
  { href: "/quotations", label: "Quotations" },
  { href: "/products", label: "Products" },
  { href: "/notifications", label: "Notifications" },
  { href: "/approvals", label: "Approvals" },
  { href: "/introductions", label: "Introductions" },
  { href: "/webhook-events", label: "Webhook Events" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
  { href: "/login", label: "Login" },
];

export default async function Page() {
  const session = await requirePageSession();
  const metrics = await getDashboardMetrics(session.organizationId);
  const funnel = await getFunnelMetrics(session.organizationId);

  const isAdmin = session.role === "OWNER" || session.role === "ADMIN";
  const report = isAdmin
    ? await generateWeeklyReport(session.organizationId)
    : null;

  const cards = [
    {
      title: "Leads",
      value: metrics.leadCount,
      note: "Inbound trade opportunities",
    },
    {
      title: "Companies",
      value: metrics.companyCount,
      note: "Buyers, sellers, partners",
    },
    {
      title: "Quotations",
      value: metrics.quotationCount,
      note: "Drafts and sent quotes",
    },
    {
      title: "Products",
      value: metrics.productCount,
      note: "Catalog items for quotes",
    },
    { title: "Tasks", value: metrics.taskCount, note: "Follow-up work queue" },
    {
      title: "Pending Approvals",
      value: metrics.pendingApprovalCount,
      note: "High-risk actions waiting for review",
    },
    {
      title: "Webhook Events",
      value: metrics.webhookEventCount,
      note: "Inbound events with idempotency log",
    },
    {
      title: "Webhook Failures (24h)",
      value: metrics.webhookFailureCount,
      note:
        metrics.webhookTotal24h > 0
          ? `${((metrics.webhookFailureCount / metrics.webhookTotal24h) * 100).toFixed(1)}% failure rate`
          : "No events in last 24h",
    },
    {
      title: "Queue Depth",
      value: metrics.pendingJobCount,
      note: `${metrics.failedJob24hCount} failed in last 24h`,
    },
    {
      title: "AI Spend (MTD)",
      value: `$${metrics.aiTotalSpendMonth.toFixed(2)}`,
      note:
        metrics.aiBudget > 0
          ? `${metrics.aiCallCountMonth} calls of $${metrics.aiBudget.toFixed(2)} budget`
          : `${metrics.aiCallCountMonth} calls (unlimited)`,
    },
  ];

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span
          style={{
            borderRadius: 999,
            background: "#eef2ff",
            color: "#3730a3",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          TradeOS Core MVP
        </span>
        <SignOutButton />
      </div>
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>
        AI Operating System for International Trade
      </h1>
      <p style={{ maxWidth: 760, color: "#4b5563", fontSize: 18 }}>
        Tenant: {session.organizationId}. Auth provider: {session.authProvider}
      </p>

      <nav
        style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "24px 0" }}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              background: "#111827",
              color: "white",
              padding: "10px 14px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16 }}>{card.title}</h2>
            <strong style={{ display: "block", fontSize: 36, marginTop: 12 }}>
              {card.value}
            </strong>
            <p style={{ color: "#6b7280" }}>{card.note}</p>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>
          Revenue Funnel (7 days)
        </h2>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginBottom: 16,
          }}
        >
          {funnel.stages.map((stage) => (
            <div
              key={stage.label}
              style={{
                background: "#faf5ff",
                border: "1px solid #d8b4fe",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#6b21a8" }}>
                {stage.label}
              </p>
              <strong style={{ fontSize: 28, display: "block", marginTop: 4 }}>
                {stage.count}
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "#6b21a8" }}>
                {stage.percentage}% of inbound
              </p>
            </div>
          ))}
        </div>
        {funnel.staleValueEstimate > 0 && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "#991b1b" }}>
              Missed Revenue Estimate:{" "}
              <strong>
                ${funnel.staleValueEstimate.toLocaleString()}{" "}
                {funnel.staleValueCurrency}
              </strong>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#991b1b" }}>
              {metrics.staleLeadCount} stale leads × avg deal value × conversion
              rate (configured in Settings)
            </p>
          </div>
        )}
        {funnel.responseTimeByChannel.length > 0 && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, color: "#166534" }}>
              Response Speed by Channel
            </h3>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {funnel.responseTimeByChannel.map((r) => (
                <span
                  key={r.channel}
                  style={{
                    background: "#dcfce7",
                    color: "#166534",
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {r.channel}:{" "}
                  {r.avgHours !== null ? `${r.avgHours.toFixed(1)}h` : "N/A"}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: 32,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #fde047",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>Stale Leads</h2>
          <strong
            style={{
              display: "block",
              fontSize: 36,
              marginTop: 12,
              color: "#92400e",
            }}
          >
            {metrics.staleLeadCount}
          </strong>
          <p style={{ color: "#92400e" }}>
            Leads not updated in 7+ days (excluding won/lost)
          </p>
        </div>
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>Response Speed</h2>
          <strong style={{ display: "block", fontSize: 22, marginTop: 12 }}>
            {metrics.responseTimeLabel}
          </strong>
          <p style={{ color: "#6b7280" }}>
            Avg time from lead creation to first quotation
          </p>
        </div>
      </section>

      {report && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Weekly Report</h2>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Period: {report.periodStart} to {report.periodEnd}
          </p>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#166534" }}>
                Inbound Volume
              </h3>
              <strong style={{ fontSize: 28, display: "block", marginTop: 8 }}>
                {report.inboundVolume}
              </strong>
              <p style={{ fontSize: 12, color: "#166534" }}>
                Webhook events this week
              </p>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#166534" }}>
                Quotations
              </h3>
              <strong style={{ fontSize: 28, display: "block", marginTop: 8 }}>
                {report.quotationVolume}
              </strong>
              <p style={{ fontSize: 12, color: "#166534" }}>
                {report.quotationSentVolume} sent this week
              </p>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#166534" }}>
                Response Speed
              </h3>
              <strong style={{ fontSize: 22, display: "block", marginTop: 8 }}>
                {report.responseSpeedLabel}
              </strong>
              <p style={{ fontSize: 12, color: "#166534" }}>
                Lead to first quotation
              </p>
            </div>
            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fde047",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#92400e" }}>
                Stale Leads
              </h3>
              <strong
                style={{
                  fontSize: 28,
                  display: "block",
                  marginTop: 8,
                  color: "#92400e",
                }}
              >
                {report.staleLeadCount}
              </strong>
              <p style={{ fontSize: 12, color: "#92400e" }}>Needs attention</p>
            </div>
          </div>

          {report.topDemandCategories.length > 0 && (
            <div
              style={{
                marginTop: 16,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                Top Demand Categories
              </h3>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                {report.topDemandCategories.map((cat) => (
                  <span
                    key={cat.category}
                    style={{
                      background: "#e0e7ff",
                      color: "#3730a3",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {cat.category} ({cat.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#9ca3af",
              fontStyle: "italic",
            }}
          >
            {report.dataPrivacyNote}
          </p>
        </section>
      )}
    </main>
  );
}

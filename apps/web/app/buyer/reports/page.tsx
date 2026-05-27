import { requirePagePermission } from "../../../lib/page-session";

export default async function BuyerReportsPage() {
  const session = await requirePagePermission("buyerReport.view_assigned");

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
      <section
        style={{
          marginTop: 24,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          background: "white",
        }}
      >
        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>No assigned reports</h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          When an internal team publishes a buyer-safe Supplier Switch report to
          you, it will appear here. Internal sourcing runs, raw supplier notes,
          quotes, and organization settings are not accessible from this role.
        </p>
      </section>
    </main>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@tradeos/database";
import {
  requirePageSession,
  requirePagePermission,
} from "../../../lib/page-session";
import { SendButton } from "./SendButton";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("quotation.draft");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true } },
      lineItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!quotation || quotation.organizationId !== session.organizationId) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    DRAFT: "#f59e0b",
    SENT: "#2563eb",
    ACCEPTED: "#16a34a",
    REJECTED: "#dc2626",
    EXPIRED: "#6b7280",
  };

  return (
    <main
      style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 960 }}
    >
      <a href="/quotations" style={{ color: "#2563eb" }}>
        Back to quotations
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
          <h1 style={{ fontSize: 28, margin: 0 }}>{quotation.title}</h1>
          <p style={{ color: "#6b7280", marginTop: 4 }}>
            Created {quotation.createdAt.toLocaleDateString()}
            {quotation.lead && (
              <>
                {" "}
                &middot; Lead:{" "}
                <a
                  href={`/leads/${quotation.lead.id}`}
                  style={{ color: "#2563eb" }}
                >
                  {quotation.lead.name || quotation.lead.id}
                </a>
              </>
            )}
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
              background: statusColors[quotation.status] || "#e5e7eb",
              color: "#fff",
            }}
          >
            {quotation.status}
          </span>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>
            {quotation.totalAmount?.toString() ?? "TBD"}{" "}
            {quotation.currency || ""}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SendButton quotationId={quotation.id} status={quotation.status} />
      </div>

      <section style={{ marginTop: 32 }}>
        <h2
          style={{
            fontSize: 18,
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          Terms &amp; Description
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              color: "#dc2626",
              fontWeight: 600,
              border: "1px solid #dc2626",
              borderRadius: 4,
              padding: "2px 6px",
              verticalAlign: "middle",
            }}
          >
            REVIEW REQUIRED
          </span>
        </h2>
        <div
          style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#374151" }}
        >
          {quotation.content}
        </div>
      </section>

      {quotation.lineItems.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2
            style={{
              fontSize: 18,
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 8,
            }}
          >
            Line Items
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "#dc2626",
                fontWeight: 600,
                border: "1px solid #dc2626",
                borderRadius: 4,
                padding: "2px 6px",
                verticalAlign: "middle",
              }}
            >
              REVIEW REQUIRED
            </span>
          </h2>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  Description
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  Qty
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  Unit
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  Unit Price
                </th>
                <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {quotation.lineItems.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {item.quantity.toString()}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {item.unit || "-"}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {item.unitPrice.toString()} {item.currency || ""}
                  </td>
                  <td
                    style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}
                  >
                    {item.totalAmount?.toString() || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section
        style={{
          marginTop: 32,
          padding: 16,
          background: "#fefce8",
          borderRadius: 12,
          border: "1px solid #fde047",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, color: "#854d0e" }}>
          ⚠️ Review Required
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#713f12" }}>
          This quotation was drafted by AI or created from an inbound message.
          All terms, amounts, line items, and conditions must be reviewed by a
          human before sending. Use the &quot;Send Quotation&quot; button to
          create an approval request — an admin must approve before the
          quotation is sent.
        </p>
      </section>
    </main>
  );
}

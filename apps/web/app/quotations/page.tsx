import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../lib/page-session";
import EmptyState from "../../components/empty-state";

export default async function QuotationsPage() {
  const session = await requirePagePermission("quotation.draft");
  const quotations = await prisma.quotation.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { lineItems: true } } },
  });

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a href="/" style={{ color: "#2563eb" }}>
        Back
      </a>
      <h1>Quotations</h1>
      <p>
        Tenant: {session.organizationId}. AI may draft quotations, but humans
        must review before sending.
      </p>

      {quotations.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Quotations are created from leads and contain product line items with pricing. AI can draft them, but a human must review before sending."
        />
      ) : (
        quotations.map((quote) => (
          <a
            key={quote.id}
            href={`/quotations/${quote.id}`}
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
                <strong style={{ fontSize: 16 }}>{quote.title}</strong>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      quote.status === "DRAFT"
                        ? "#fef3c7"
                        : quote.status === "SENT"
                          ? "#dbeafe"
                          : "#e5e7eb",
                    color:
                      quote.status === "DRAFT"
                        ? "#92400e"
                        : quote.status === "SENT"
                          ? "#1e40af"
                          : "#374151",
                  }}
                >
                  {quote.status}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
                Amount: {quote.totalAmount?.toString() || "TBD"}{" "}
                {quote.currency || ""}
                {quote._count.lineItems > 0 && (
                  <>
                    {" "}
                    &middot; {quote._count.lineItems} item
                    {quote._count.lineItems > 1 ? "s" : ""}
                  </>
                )}
                &middot; {quote.createdAt.toLocaleDateString()}
              </p>
            </article>
          </a>
        ))
      )}
    </main>
  );
}

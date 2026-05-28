import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import { notFound } from "next/navigation";
import "@tradeos/sourcing-core";
import PurchaseBaselineForm from "./purchase-baseline-form";
import SupplierAlternativeForm from "./supplier-alternative-form";
import SwitchDecisionDisplay from "./switch-decision-display";
import DeliverBuyerReport from "./deliver-buyer-report";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  READY_FOR_REVIEW: "#2563eb",
  IN_REVIEW: "#7c3aed",
  COMPARED: "#0891b2",
  READY_FOR_REPORT: "#ca8a04",
  REPORT_DELIVERED: "#059669",
  CANCELLED: "#dc2626",
  DELIVERED: "#059669",
  PENDING: "#6b7280",
  APPROVED: "#2563eb",
  BILLED: "#7c3aed",
};

const STALE_DAYS = 14;

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

export default async function SourcingRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("sourcing.view");
  const { id } = await params;

  const run = await prisma.sourcingRun.findUnique({
    where: { id },
    include: {
      supplierCandidates: { orderBy: { createdAt: "desc" } },
      supplierQuotes: {
        orderBy: { comparisonRank: { sort: "asc", nulls: "last" } },
        include: { supplierCandidate: { select: { name: true } } },
      },
      evidenceItems: {
        orderBy: { capturedAt: "desc" },
        select: {
          id: true,
          evidenceType: true,
          title: true,
          description: true,
          content: true,
          fileUrl: true,
          externalUrl: true,
          capturedAt: true,
        },
      },
      purchaseBaselines: { orderBy: { createdAt: "desc" } },
      supplierAlternatives: {
        orderBy: { createdAt: "desc" },
        include: { supplierCandidate: { select: { name: true } } },
      },
      checkpoints: { orderBy: { createdAt: "asc" } },
      handovers: { orderBy: { createdAt: "desc" } },
    },
  });

  const [latestReport, outcome] = await Promise.all([
    prisma.switchDecisionReport.findFirst({
      where: { sourcingRunId: id, organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      select: { buyerDecision: true, buyerDecidedAt: true, id: true },
    }),
    prisma.outcomeRecord.findFirst({
      where: { sourcingRunId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, buyerAction: true, createdAt: true },
    }),
  ]);

  if (!run || run.organizationId !== session.organizationId) {
    notFound();
  }

  const daysSinceDecision = latestReport?.buyerDecidedAt
    ? (Date.now() - new Date(latestReport.buyerDecidedAt).getTime()) /
      (1000 * 60 * 60 * 24)
    : 0;
  const isStaleApproved =
    latestReport?.buyerDecision === "APPROVED" &&
    latestReport.buyerDecidedAt &&
    !outcome &&
    daysSinceDecision >= STALE_DAYS;
  const isOutcomePending =
    latestReport?.buyerDecision && !outcome && !isStaleApproved;

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a
        href="/sourcing-runs"
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing runs
      </a>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{run.title}</h1>
          <p style={{ color: "#666", marginTop: 4 }}>
            <StatusBadge status={run.status} /> &middot; Created{" "}
            {run.createdAt.toLocaleDateString()}
          </p>
        </div>
      </div>

      {isStaleApproved && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #dc2626",
            borderRadius: 8,
            padding: "12px 16px",
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong style={{ color: "#dc2626", fontSize: 14 }}>
              Stale APPROVED — no outcome recorded
            </strong>
            <p style={{ color: "#991b1b", fontSize: 13, margin: "4px 0 0" }}>
              Buyer approved {STALE_DAYS}+ days ago but no outcome follow-up.
              Record outcome now.
            </p>
          </div>
          <a
            href={`/sourcing-runs/${id}/outcome`}
            style={{
              padding: "8px 16px",
              background: "#dc2626",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Record Outcome
          </a>
        </div>
      )}

      {isOutcomePending && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "12px 16px",
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong style={{ color: "#b45309", fontSize: 14 }}>
              Outcome Pending
            </strong>
            <p style={{ color: "#92400e", fontSize: 13, margin: "4px 0 0" }}>
              Buyer decision recorded but outcome not yet captured. Close the
              learning loop.
            </p>
          </div>
          <a
            href={`/sourcing-runs/${id}/outcome`}
            style={{
              padding: "8px 16px",
              background: "#f59e0b",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Record Outcome
          </a>
        </div>
      )}

      {latestReport?.buyerDecision && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            Buyer decision:{" "}
            <strong
              style={{
                color:
                  latestReport.buyerDecision === "APPROVED"
                    ? "#059669"
                    : latestReport.buyerDecision === "REJECTED"
                      ? "#dc2626"
                      : "#ca8a04",
              }}
            >
              {latestReport.buyerDecision.replace(/_/g, " ")}
            </strong>
          </span>
          {latestReport.buyerDecidedAt && (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              {new Date(latestReport.buyerDecidedAt).toLocaleDateString()}
            </span>
          )}
          {outcome ? (
            <a
              href={`/sourcing-runs/${id}/outcome`}
              style={{
                color: "#059669",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View outcome &rarr;
            </a>
          ) : (
            <a
              href={`/sourcing-runs/${id}/outcome`}
              style={{ color: "#0070f3", fontSize: 13, textDecoration: "none" }}
            >
              Record outcome &rarr;
            </a>
          )}
        </div>
      )}

      {run.requirement && (
        <p>
          <strong>Requirement:</strong> {run.requirement}
        </p>
      )}
      <p style={{ color: "#666", fontSize: 14 }}>
        {run.targetCountry && `Target: ${run.targetCountry} `}
        {run.sourceCountry && `| Source: ${run.sourceCountry} `}
        {run.productCategory && `| Category: ${run.productCategory}`}
      </p>

      {latestReport && !latestReport.buyerDecision && (
        <div style={{ marginTop: 16 }}>
          <a
            href={`/sourcing-runs/${id}/decision`}
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Go to Buyer Decision
          </a>
        </div>
      )}

      <section style={{ marginTop: 32 }}>
        <h2>Supplier Candidates ({run.supplierCandidates.length})</h2>
        {run.supplierCandidates.length === 0 ? (
          <p style={{ color: "#999" }}>No suppliers added yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 500,
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}
                >
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Source</th>
                  <th style={{ padding: 8 }}>Country</th>
                  <th style={{ padding: 8 }}>Reliability</th>
                  <th style={{ padding: 8 }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {run.supplierCandidates.map((c) => {
                  const riskFlags = Array.isArray(c.riskFlags)
                    ? c.riskFlags.join(", ")
                    : typeof c.riskFlags === "string"
                      ? c.riskFlags
                      : "None";
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>
                        {c.website ? (
                          <a href={c.website} style={{ color: "#0070f3" }}>
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </td>
                      <td style={{ padding: 8 }}>{c.source}</td>
                      <td style={{ padding: 8 }}>{c.country || "-"}</td>
                      <td style={{ padding: 8 }}>
                        {c.reliabilityScore != null
                          ? `${c.reliabilityScore}/10`
                          : "-"}
                      </td>
                      <td style={{ padding: 8 }}>{riskFlags}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Purchase Baseline ({run.purchaseBaselines.length})</h2>
        {run.purchaseBaselines.length === 0 ? (
          <p style={{ color: "#999" }}>
            No purchase baseline recorded yet. Enter your current supplier
            information below.
          </p>
        ) : (
          run.purchaseBaselines.map((b) => (
            <div
              key={b.id}
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
                  marginBottom: 8,
                }}
              >
                <strong>{b.supplierName}</strong>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {b.sourceType}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>{b.productDescription}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 8,
                  marginTop: 8,
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                {b.quantity != null && <span>Qty: {String(b.quantity)}</span>}
                {b.unit && <span>Unit: {b.unit}</span>}
                {b.unitPrice != null && (
                  <span>Price: {String(b.unitPrice)}</span>
                )}
                {b.currency && <span>Currency: {b.currency}</span>}
                {b.frequency && <span>Frequency: {b.frequency}</span>}
                {b.paymentTerms && <span>Payment: {b.paymentTerms}</span>}
                {b.deliveryTerms && <span>Delivery: {b.deliveryTerms}</span>}
                {b.leadTime && <span>Lead: {b.leadTime}</span>}
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 16 }}>
          <PurchaseBaselineForm sourcingRunId={id} />
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Supplier Alternatives ({run.supplierAlternatives.length})</h2>
        {run.supplierAlternatives.length === 0 ? (
          <p style={{ color: "#999" }}>
            No alternative suppliers recorded yet. Add potential alternatives
            below.
          </p>
        ) : (
          run.supplierAlternatives.map((a) => (
            <div
              key={a.id}
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
                  marginBottom: 8,
                }}
              >
                <strong>{a.supplierName}</strong>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {a.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>{a.productDescription}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 8,
                  marginTop: 8,
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                {a.quantity != null && <span>Qty: {String(a.quantity)}</span>}
                {a.unit && <span>Unit: {a.unit}</span>}
                {a.unitPrice != null && (
                  <span>Price: {String(a.unitPrice)}</span>
                )}
                {a.totalCost != null && (
                  <span>Total: {String(a.totalCost)}</span>
                )}
                {a.currency && <span>Currency: {a.currency}</span>}
                {a.moq && <span>MOQ: {a.moq}</span>}
                {a.leadTime && <span>Lead: {a.leadTime}</span>}
                {a.paymentTerm && <span>Payment: {a.paymentTerm}</span>}
                {a.evidenceId && <span>Evidence: {a.evidenceId}</span>}
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 16 }}>
          <SupplierAlternativeForm sourcingRunId={id} />
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Switch Decision Report</h2>
        <SwitchDecisionDisplay sourcingRunId={id} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Supplier Quotes ({run.supplierQuotes.length})</h2>
        {run.supplierQuotes.length === 0 ? (
          <p style={{ color: "#999" }}>No quotes collected yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 600,
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}
                >
                  <th style={{ padding: 8 }}>Rank</th>
                  <th style={{ padding: 8 }}>Supplier</th>
                  <th style={{ padding: 8 }}>Product</th>
                  <th style={{ padding: 8 }}>Amount</th>
                  <th style={{ padding: 8 }}>Lead Time</th>
                  <th style={{ padding: 8 }}>Payment</th>
                  <th style={{ padding: 8 }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {run.supplierQuotes.map((q) => (
                  <tr
                    key={q.id}
                    style={{
                      borderBottom: "1px solid #eee",
                      background:
                        q.comparisonRank === 1 ? "#f0fdf4" : undefined,
                    }}
                  >
                    <td style={{ padding: 8 }}>
                      {q.comparisonRank != null ? (
                        <strong>#{q.comparisonRank}</strong>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: 8 }}>
                      {q.supplierCandidate?.name || "Unknown"}
                    </td>
                    <td style={{ padding: 8 }}>{q.productDescription}</td>
                    <td style={{ padding: 8 }}>
                      {q.totalAmount != null
                        ? `${q.totalAmount} ${q.currency || ""}`
                        : "-"}
                    </td>
                    <td style={{ padding: 8 }}>{q.leadTime || "-"}</td>
                    <td style={{ padding: 8 }}>{q.paymentTerm || "-"}</td>
                    <td style={{ padding: 8 }}>{q.riskScore ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Evidence ({run.evidenceItems.length})</h2>
        {run.evidenceItems.length === 0 ? (
          <p style={{ color: "#999" }}>No evidence captured yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {run.evidenceItems.map((e) => (
              <div
                key={e.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <strong style={{ fontSize: 14 }}>{e.title}</strong>
                  <StatusBadge status={e.evidenceType} />
                </div>
                {e.description && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    {e.description}
                  </p>
                )}
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  {e.capturedAt.toLocaleDateString()}
                  {e.fileUrl && (
                    <>
                      {" · "}
                      <a
                        href={e.fileUrl}
                        target="_blank"
                        style={{ color: "#0070f3" }}
                      >
                        View file
                      </a>
                    </>
                  )}
                  {e.externalUrl && (
                    <>
                      {" · "}
                      <a
                        href={e.externalUrl}
                        target="_blank"
                        style={{ color: "#0070f3" }}
                      >
                        External link
                      </a>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {run.checkpoints.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Checkpoints</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 500,
              }}
            >
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}
                >
                  <th style={{ padding: 8 }}>Title</th>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {run.checkpoints.map((cp) => (
                  <tr key={cp.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>{cp.title}</td>
                    <td style={{ padding: 8 }}>{cp.checkpointType}</td>
                    <td style={{ padding: 8 }}>
                      <StatusBadge status={cp.status} />
                    </td>
                    <td style={{ padding: 8 }}>
                      {cp.deliveredAt
                        ? cp.deliveredAt.toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {latestReport && <DeliverBuyerReport sourcingRunId={id} />}

      {run.handovers.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Human Handovers</h2>
          <ul>
            {run.handovers.map((h) => (
              <li key={h.id}>
                {h.reason} &mdash;{" "}
                {h.resolvedAt
                  ? `Resolved ${h.resolvedAt.toLocaleDateString()}`
                  : "Pending resolution"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

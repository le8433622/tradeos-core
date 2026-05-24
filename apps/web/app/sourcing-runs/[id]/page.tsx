import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../lib/page-session";
import { notFound } from "next/navigation";
import "@tradeos/sourcing-core";

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
        select: { id: true, evidenceType: true, title: true, capturedAt: true },
      },
      checkpoints: { orderBy: { createdAt: "asc" } },
      handovers: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!run || run.organizationId !== session.organizationId) {
    notFound();
  }

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <a
        href="/sourcing-runs"
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing runs
      </a>

      <h1 style={{ marginTop: 16 }}>{run.title}</h1>
      <p style={{ color: "#666" }}>
        Status: <strong>{run.status}</strong> &middot; Created{" "}
        {run.createdAt.toLocaleDateString()}
      </p>
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

      <section style={{ marginTop: 32 }}>
        <h2>Supplier Candidates ({run.supplierCandidates.length})</h2>
        {run.supplierCandidates.length === 0 ? (
          <p style={{ color: "#999" }}>No suppliers added yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
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
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Supplier Quotes ({run.supplierQuotes.length})</h2>
        {run.supplierQuotes.length === 0 ? (
          <p style={{ color: "#999" }}>No quotes collected yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
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
                <tr key={q.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{q.comparisonRank ?? "-"}</td>
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
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Evidence ({run.evidenceItems.length})</h2>
        {run.evidenceItems.length === 0 ? (
          <p style={{ color: "#999" }}>No evidence captured yet.</p>
        ) : (
          <ul>
            {run.evidenceItems.map((e) => (
              <li key={e.id}>
                [{e.evidenceType}] {e.title} &mdash;{" "}
                {e.capturedAt.toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      {run.checkpoints.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Checkpoints</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
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
                  <td style={{ padding: 8 }}>{cp.status}</td>
                  <td style={{ padding: 8 }}>
                    {cp.deliveredAt ? cp.deliveredAt.toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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

import { prisma } from "@tradeos/database";
import { requirePagePermission } from "../../../../lib/page-session";
import { notFound } from "next/navigation";
import BuyerDecisionForm from "./buyer-decision-form";

function ScoreBar({
  label,
  score,
  color,
  invert = false,
}: {
  label: string;
  score: number;
  color: string;
  invert?: boolean;
}) {
  const val = invert ? 100 - score : score;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>{score}/100</span>
      </div>
      <div
        style={{
          height: 8,
          background: "#e5e7eb",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${val}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 500, color: "#111827" }}>{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
  borderColor = "#e5e7eb",
  bg = "white",
}: {
  title: string;
  children: React.ReactNode;
  borderColor?: string;
  bg?: string;
}) {
  return (
    <section
      style={{
        marginTop: 16,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 20,
        background: bg,
      }}
    >
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>{title}</h2>
      {children}
    </section>
  );
}

export default async function BuyerReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("buyerReport.view_assigned");
  const { id } = await params;

  const delivery = await prisma.buyerReportDelivery.findFirst({
    where: {
      sourcingRunId: id,
      assignedToEmail: session.email,
    },
  });

  if (!delivery) {
    notFound();
  }

  const [sourcingRun, report] = await Promise.all([
    prisma.sourcingRun.findUnique({
      where: { id: delivery.sourcingRunId },
      select: {
        id: true,
        title: true,
        requirement: true,
        targetCountry: true,
        sourceCountry: true,
        productCategory: true,
        quantity: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.switchDecisionReport.findFirst({
      where: { sourcingRunId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recommendation: true,
        confidence: true,
        savingsScore: true,
        evidenceScore: true,
        paymentRiskScore: true,
        leadTimeRiskScore: true,
        dependencyRiskScore: true,
        overallScore: true,
        monthlySavings: true,
        annualSavings: true,
        savingsPercent: true,
        currency: true,
        summary: true,
        nextActions: true,
        evidenceSummary: true,
        missingProof: true,
        riskFlags: true,
        baselineId: true,
        topAlternativeId: true,
        buyerDecision: true,
        buyerDecidedAt: true,
      },
    }),
  ]);

  if (!sourcingRun || !report) {
    notFound();
  }

  const [baseline, topAlternative, outcome] = await Promise.all([
    report.baselineId
      ? prisma.purchaseBaseline.findUnique({
          where: { id: report.baselineId },
        })
      : null,
    report.topAlternativeId
      ? prisma.supplierAlternative.findUnique({
          where: { id: report.topAlternativeId },
        })
      : null,
    prisma.outcomeRecord.findFirst({
      where: { sourcingRunId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        buyerAction: true,
        createdAt: true,
        learningNote: true,
      },
    }),
  ]);

  if (delivery.status === "PENDING") {
    await prisma.buyerReportDelivery.update({
      where: { id: delivery.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }

  const recommendationColor =
    report.recommendation === "SWITCH"
      ? "#d1fae5"
      : report.recommendation === "NEGOTIATE"
        ? "#fef3c7"
        : report.recommendation === "INSUFFICIENT_EVIDENCE"
          ? "#f3f4f6"
          : "#fee2e2";
  const recommendationTextColor =
    report.recommendation === "SWITCH"
      ? "#065f46"
      : report.recommendation === "NEGOTIATE"
        ? "#92400e"
        : report.recommendation === "INSUFFICIENT_EVIDENCE"
          ? "#6b7280"
          : "#991b1b";

  return (
    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <a
        href="/buyer/reports"
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to reports
      </a>

      <div style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 4px" }}>{sourcingRun.title}</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          {sourcingRun.productCategory && `${sourcingRun.productCategory}`}
          {sourcingRun.targetCountry &&
            ` - Target: ${sourcingRun.targetCountry}`}
          {sourcingRun.sourceCountry &&
            ` | Source: ${sourcingRun.sourceCountry}`}
        </p>
      </div>

      {/* 1. Current Situation */}
      <Section title="Current Situation">
        <p style={{ color: "#374151", fontSize: 14, margin: "0 0 12px" }}>
          {sourcingRun.requirement}
        </p>
        <div>
          {baseline && (
            <>
              <InfoRow label="Current Supplier" value={baseline.supplierName} />
              <InfoRow
                label="Product / Service"
                value={baseline.productDescription}
              />
              <InfoRow
                label="Unit Price"
                value={
                  baseline.unitPrice != null
                    ? `${baseline.currency ?? ""} ${Number(baseline.unitPrice).toLocaleString()}`
                    : null
                }
              />
              <InfoRow
                label="Quantity"
                value={
                  baseline.quantity != null
                    ? `${Number(baseline.quantity)}${baseline.unit ? ` ${baseline.unit}` : ""}`
                    : null
                }
              />
              <InfoRow label="Frequency" value={baseline.frequency} />
              <InfoRow
                label="Annual Equivalent"
                value={
                  baseline.annualEquivalent != null
                    ? `${baseline.currency ?? ""} ${Number(baseline.annualEquivalent).toLocaleString()}`
                    : null
                }
              />
              <InfoRow label="Payment Terms" value={baseline.paymentTerms} />
              <InfoRow label="Delivery Terms" value={baseline.deliveryTerms} />
              <InfoRow label="Lead Time" value={baseline.leadTime} />
            </>
          )}
          {!baseline && (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>
              Baseline purchase details not available
            </p>
          )}
        </div>
      </Section>

      {/* 2. Evidence Summary */}
      <Section title="Evidence Summary">
        {report.evidenceSummary ? (
          <div>
            {(
              report.evidenceSummary as Array<{
                label?: string;
                value?: string;
                quality?: string;
              }>
            )?.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Evidence
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Quality
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    report.evidenceSummary as Array<{
                      label?: string;
                      quality?: string;
                    }>
                  ).map(
                    (e: { label?: string; quality?: string }, i: number) => (
                      <tr key={i}>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          {e.label ?? `Evidence ${i + 1}`}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                            color:
                              e.quality === "HIGH"
                                ? "#059669"
                                : e.quality === "MEDIUM"
                                  ? "#ca8a04"
                                  : "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          {e.quality ?? "UNKNOWN"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <pre
                style={{
                  fontSize: 13,
                  color: "#374151",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(report.evidenceSummary, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            No evidence summary available
          </p>
        )}

        {Array.isArray(report.missingProof) &&
          report.missingProof.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#fffbeb",
                borderRadius: 8,
                border: "1px solid #fde68a",
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#92400e",
                  margin: "0 0 6px",
                }}
              >
                Missing Proof
              </h3>
              <ul style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
                {(report.missingProof as string[]).map(
                  (m: string, i: number) => (
                    <li key={i} style={{ marginBottom: 2 }}>
                      {m}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

        <ScoreBar
          label="Evidence Confidence"
          score={report.evidenceScore ?? 0}
          color="#2563eb"
        />
      </Section>

      {/* 3. Comparison */}
      <Section title="Comparison">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            fontSize: 14,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "#f9fafb",
              borderRadius: 8,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#6b7280",
                margin: "0 0 8px",
              }}
            >
              Current
            </h3>
            <div>
              <InfoRow
                label="Supplier"
                value={baseline?.supplierName ?? "Unknown"}
              />
              <InfoRow
                label="Price"
                value={
                  baseline?.unitPrice != null
                    ? `${baseline.currency ?? ""} ${Number(baseline.unitPrice).toLocaleString()}`
                    : "Unknown"
                }
              />
              <InfoRow
                label="Lead Time"
                value={baseline?.leadTime ?? "Unknown"}
              />
              <InfoRow
                label="Payment Terms"
                value={baseline?.paymentTerms ?? "Unknown"}
              />
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: "#ecfeff",
              borderRadius: 8,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#155e75",
                margin: "0 0 8px",
              }}
            >
              Alternative
            </h3>
            <div>
              <InfoRow
                label="Supplier"
                value={topAlternative?.supplierName ?? "N/A"}
              />
              <InfoRow
                label="Price"
                value={
                  topAlternative?.unitPrice != null
                    ? `${topAlternative.currency ?? ""} ${Number(topAlternative.unitPrice).toLocaleString()}`
                    : "N/A"
                }
              />
              <InfoRow
                label="Lead Time"
                value={topAlternative?.leadTime ?? "N/A"}
              />
              <InfoRow
                label="Payment Terms"
                value={topAlternative?.paymentTerm ?? "N/A"}
              />
            </div>
          </div>
        </div>

        {report.savingsPercent != null && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#f0fdf4",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Estimated Savings
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#065f46",
              }}
            >
              {Number(report.savingsPercent).toFixed(1)}%
            </div>
            {report.monthlySavings && (
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
                ~{report.currency ?? ""}
                {Number(report.monthlySavings).toLocaleString()}/month
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#6b7280",
              margin: "0 0 8px",
            }}
          >
            Score Breakdown
          </h3>
          <ScoreBar
            label="Savings Potential"
            score={report.savingsScore ?? 0}
            color="#059669"
          />
          <ScoreBar
            label="Payment Risk (lower is better)"
            score={report.paymentRiskScore ?? 0}
            color={
              report.paymentRiskScore != null && report.paymentRiskScore > 50
                ? "#dc2626"
                : "#ca8a04"
            }
            invert
          />
          <ScoreBar
            label="Lead Time Risk (lower is better)"
            score={report.leadTimeRiskScore ?? 0}
            color={
              report.leadTimeRiskScore != null && report.leadTimeRiskScore > 50
                ? "#dc2626"
                : "#ca8a04"
            }
            invert
          />
          <ScoreBar
            label="Dependency Risk (lower is better)"
            score={report.dependencyRiskScore ?? 0}
            color={
              report.dependencyRiskScore != null &&
              report.dependencyRiskScore > 50
                ? "#dc2626"
                : "#ca8a04"
            }
            invert
          />
        </div>
      </Section>

      {/* 4. Risk & Dependency */}
      {Array.isArray(report.riskFlags) && report.riskFlags.length > 0 && (
        <Section title="Risk & Dependency" borderColor="#fee2e2" bg="#fef2f2">
          <ul style={{ margin: 0, fontSize: 14, color: "#991b1b" }}>
            {(report.riskFlags as string[]).map((f: string, i: number) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {f}
              </li>
            ))}
          </ul>
          {topAlternative?.riskFlags && (
            <div style={{ marginTop: 12 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#991b1b",
                  margin: "0 0 6px",
                }}
              >
                Alternative Risk Flags
              </h3>
              <ul style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>
                {(topAlternative.riskFlags as string[]).map(
                  (f: string, i: number) => (
                    <li key={i} style={{ marginBottom: 2 }}>
                      {f}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* 5. Recommendation */}
      <Section title="Recommendation">
        <div
          style={{
            padding: 16,
            background: recommendationColor,
            borderRadius: 8,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: recommendationTextColor,
            }}
          >
            {report.recommendation === "INSUFFICIENT_EVIDENCE"
              ? "Insufficient Evidence"
              : report.recommendation}
          </div>
          <div
            style={{
              fontSize: 13,
              color: recommendationTextColor,
              marginTop: 4,
            }}
          >
            Confidence: {report.confidence} &middot; Overall Score:{" "}
            {report.overallScore}/100
          </div>
        </div>

        {report.summary && (
          <p
            style={{
              fontSize: 14,
              color: "#374151",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {report.summary}
          </p>
        )}
      </Section>

      {/* 6. Next Actions */}
      {Array.isArray(report.nextActions) && report.nextActions.length > 0 && (
        <Section title="Next Actions">
          <ul style={{ margin: 0, fontSize: 14 }}>
            {(report.nextActions as string[]).map((a: string, i: number) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {a}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Decision */}
      {report.buyerDecision ? (
        <Section title="Your Decision" borderColor="#d1fae5" bg="#f0fdf4">
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#065f46",
              margin: "0 0 4px",
            }}
          >
            {report.buyerDecision.replace(/_/g, " ")}
          </p>
          {report.buyerDecidedAt && (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Decided {new Date(report.buyerDecidedAt).toLocaleDateString()}
            </p>
          )}
        </Section>
      ) : (
        <Section title="Submit Your Decision">
          <BuyerDecisionForm sourcingRunId={id} reportId={report.id} />
        </Section>
      )}

      {/* Outcome */}
      {outcome && (
        <Section title="Outcome" borderColor="#d1fae5" bg="#f0fdf4">
          <p style={{ fontSize: 14, margin: 0 }}>
            Action: <strong>{outcome.buyerAction}</strong>
          </p>
          {outcome.learningNote && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
              Note: {outcome.learningNote}
            </p>
          )}
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
            Recorded {new Date(outcome.createdAt).toLocaleDateString()}
          </p>
        </Section>
      )}
    </main>
  );
}

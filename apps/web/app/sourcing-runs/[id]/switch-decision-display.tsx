"use client";

import { useState, useEffect } from "react";

type SwitchDecisionReport = {
  id: string;
  recommendation: string;
  confidence: string;
  savingsScore: number;
  evidenceScore: number;
  paymentRiskScore: number;
  leadTimeRiskScore: number;
  dependencyRiskScore: number;
  overallScore: number;
  monthlySavings: number | null;
  annualSavings: number | null;
  savingsPercent: number | null;
  currency: string | null;
  evidenceCount: number;
  missingProof: string[];
  riskFlags: string[];
  summary: string;
  nextActions: string[];
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  SWITCH: "#059669",
  NEGOTIATE: "#ca8a04",
  WAIT: "#dc2626",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "#059669",
  MEDIUM: "#ca8a04",
  LOW: "#dc2626",
};

export default function SwitchDecisionDisplay({
  sourcingRunId,
}: {
  sourcingRunId: string;
}) {
  const [report, setReport] = useState<SwitchDecisionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sourcing-runs/${sourcingRunId}/switch-decision`,
      );
      if (!res.ok) {
        if (res.status === 404) {
          setReport(null);
          return;
        }
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      setReport(data.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sourcing-runs/${sourcingRunId}/switch-decision`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setReport(data.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return <p style={{ color: "#999" }}>Loading switch decision...</p>;
  }

  return (
    <div>
      {!report ? (
        <div>
          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>
              {error}
            </p>
          )}
          <p style={{ color: "#999", marginBottom: 12 }}>
            No switch decision report generated yet. Generate one from your
            baseline, alternatives, and evidence.
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            style={{
              padding: "8px 16px",
              background: generating ? "#9ca3af" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: generating ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {generating ? "Generating..." : "Generate Switch Decision"}
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  background:
                    RECOMMENDATION_COLORS[report.recommendation] ?? "#6b7280",
                }}
              >
                {report.recommendation}
              </span>
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                Confidence:{" "}
                <strong
                  style={{
                    color: CONFIDENCE_COLORS[report.confidence] ?? "#6b7280",
                  }}
                >
                  {report.confidence}
                </strong>
              </span>
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                Score: <strong>{report.overallScore}/100</strong>
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 16,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              {report.monthlySavings != null && (
                <span>
                  Monthly savings:{" "}
                  <strong>
                    {formatMoney(report.monthlySavings, report.currency)}
                  </strong>
                </span>
              )}
              {report.annualSavings != null && (
                <span>
                  Annual savings:{" "}
                  <strong>
                    {formatMoney(report.annualSavings, report.currency)}
                  </strong>
                </span>
              )}
              {report.savingsPercent != null && (
                <span>
                  Savings: <strong>{report.savingsPercent}%</strong>
                </span>
              )}
              <span>
                Evidence: <strong>{report.evidenceCount} items</strong>
              </span>
            </div>

            <details>
              <summary
                style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}
              >
                Score breakdown
              </summary>
              <div style={{ marginTop: 8 }}>
                <ScoreBar label="Savings" value={report.savingsScore ?? 0} />
                <ScoreBar label="Evidence" value={report.evidenceScore ?? 0} />
                <ScoreBar
                  label="Payment risk (inverted)"
                  value={100 - (report.paymentRiskScore ?? 0)}
                />
                <ScoreBar
                  label="Lead time risk (inverted)"
                  value={100 - (report.leadTimeRiskScore ?? 0)}
                />
                <ScoreBar
                  label="Dependency risk (inverted)"
                  value={100 - (report.dependencyRiskScore ?? 0)}
                />
              </div>
            </details>

            {report.riskFlags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#dc2626",
                    margin: "0 0 4px",
                  }}
                >
                  Risk flags
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    fontSize: 13,
                    color: "#dc2626",
                  }}
                >
                  {report.riskFlags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.missingProof.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#ca8a04",
                    margin: "0 0 4px",
                  }}
                >
                  Missing proof
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    fontSize: 13,
                    color: "#ca8a04",
                  }}
                >
                  {report.missingProof.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <NextActions actions={report.nextActions} />
          </div>

          <button
            onClick={generateReport}
            disabled={generating}
            style={{
              padding: "8px 16px",
              background: generating ? "#9ca3af" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: generating ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            {generating ? "Regenerating..." : "Regenerate Report"}
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? "#059669" : pct >= 40 ? "#ca8a04" : "#dc2626";
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span>{pct}/100</span>
      </div>
      <div
        style={{
          height: 6,
          background: "#e5e7eb",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}

function NextActions({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
        Next actions
      </p>
      <ol
        style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151" }}
      >
        {actions.map((a, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {a}
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatMoney(amount: number, currency: string | null): string {
  const sym =
    currency === "VND" ? "₫" : currency === "USD" ? "$" : (currency ?? "$");
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

"use client";

import { useState } from "react";

type Props = {
  runId: string;
  reportId: string;
  recommendation: string;
  confidence: string;
  overallScore: number;
  monthlySavings: number | null;
  annualSavings: number | null;
  savingsPercent: number | null;
  currency: string | null;
  summary: string;
  riskFlags: string[];
  missingProof: string[];
  nextActions: string[];
  buyerDecision: string | null;
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  SWITCH: "#059669",
  NEGOTIATE: "#ca8a04",
  WAIT: "#dc2626",
};

const DECISION_BUTTONS = [
  { value: "APPROVE", label: "Approve Recommendation", color: "#059669" },
  {
    value: "REQUEST_MORE_PROOF",
    label: "Request More Proof",
    color: "#ca8a04",
  },
  { value: "REJECT", label: "Reject / Wait", color: "#dc2626" },
];

export default function BuyerDecisionForm(props: Props) {
  const [decision, setDecision] = useState<string | null>(props.buyerDecision);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = async (value: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sourcing-runs/${props.runId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: value, notes: notes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed: ${res.status}`);
      }
      setDecision(value);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          marginTop: 24,
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
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              background:
                RECOMMENDATION_COLORS[props.recommendation] ?? "#6b7280",
            }}
          >
            {props.recommendation}
          </span>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            Confidence: <strong>{props.confidence}</strong>
          </span>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            Score: <strong>{props.overallScore}/100</strong>
          </span>
        </div>

        <p style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>
          {props.summary}
        </p>

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
          {props.monthlySavings != null && (
            <span>
              Monthly savings:{" "}
              <strong>
                {formatMoney(props.monthlySavings, props.currency)}
              </strong>
            </span>
          )}
          {props.annualSavings != null && (
            <span>
              Annual savings:{" "}
              <strong>
                {formatMoney(props.annualSavings, props.currency)}
              </strong>
            </span>
          )}
          {props.savingsPercent != null && (
            <span>
              Savings: <strong>{props.savingsPercent?.toFixed(2)}%</strong>
            </span>
          )}
        </div>

        {props.riskFlags.length > 0 && (
          <div style={{ marginBottom: 12 }}>
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
              {props.riskFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {props.missingProof.length > 0 && (
          <div style={{ marginBottom: 12 }}>
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
              {props.missingProof.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
            Next actions
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              fontSize: 13,
              color: "#374151",
            }}
          >
            {props.nextActions.map((a, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {a}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {decision ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 16, color: "#059669" }}>
            Decision recorded: {formatDecision(decision)}
          </p>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            This decision has been saved as evidence.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
            Your Decision
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {DECISION_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                onClick={() => submitDecision(btn.value)}
                disabled={submitting}
                style={{
                  padding: "12px 24px",
                  background: submitting ? "#9ca3af" : btn.color,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 15,
                  fontWeight: 600,
                  flex: 1,
                  minWidth: 180,
                }}
              >
                {submitting ? "Submitting..." : btn.label}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="notes"
              style={{
                display: "block",
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={3}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                resize: "vertical",
              }}
              placeholder="Add any notes about your decision..."
            />
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatDecision(d: string): string {
  switch (d) {
    case "APPROVE":
      return "Approved";
    case "REQUEST_MORE_PROOF":
      return "More proof requested";
    case "REJECT":
      return "Rejected / Wait";
    default:
      return d;
  }
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

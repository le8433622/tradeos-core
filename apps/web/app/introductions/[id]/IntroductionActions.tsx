"use client";

import { useState, useCallback } from "react";
import ErrorBanner from "../../../components/error-banner";

type Props = {
  introductionId: string;
  status: string;
  isBuyer: boolean;
  isSeller: boolean;
};

export function IntroductionActions({
  introductionId,
  status,
  isBuyer,
  isSeller,
}: Props) {
  const [note, setNote] = useState("");
  const [valueGenerated, setValueGenerated] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);

  const handleAction = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setError(null);
      setSuccess(null);
      setLoading(action);

      try {
        const res = await fetch(`/api/introductions/${introductionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || "Action failed");
        }
        setSuccess(`${action} successful`);
        if (action === "approve" || action === "reject") setNote("");
        if (action === "report-value") setValueGenerated("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setLoading(null);
      }
    },
    [introductionId],
  );

  const canApprove =
    (isBuyer && status === "PENDING_BUYER_APPROVAL") ||
    (isSeller && status === "PENDING_SELLER_APPROVAL");
  const canReject = canApprove;
  const canReportValue = status === "APPROVED";

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      {success && (
        <p
          style={{
            color: "#166534",
            background: "#dcfce7",
            padding: 8,
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {success}
        </p>
      )}

      {canApprove && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
            Review Introduction
          </h3>
          <textarea
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleAction("approve", { note })}
              disabled={loading === "approve"}
              style={{
                padding: "10px 20px",
                background: "#166534",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: loading === "approve" ? "not-allowed" : "pointer",
                opacity: loading === "approve" ? 0.6 : 1,
              }}
            >
              {loading === "approve" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => handleAction("reject", { note })}
              disabled={loading === "reject"}
              style={{
                padding: "10px 20px",
                background: "#991b1b",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: loading === "reject" ? "not-allowed" : "pointer",
                opacity: loading === "reject" ? 0.6 : 1,
              }}
            >
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {canReportValue && (
        <div
          style={{
            border: "1px solid #dcfce7",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
            Report Value Generated
          </h3>
          <input
            placeholder="e.g. $50,000 deal in progress"
            value={valueGenerated}
            onChange={(e) => setValueGenerated(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <button
            onClick={() => handleAction("report-value", { valueGenerated })}
            disabled={loading === "report-value" || !valueGenerated}
            style={{
              padding: "10px 20px",
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor:
                loading === "report-value" || !valueGenerated
                  ? "not-allowed"
                  : "pointer",
              opacity: loading === "report-value" || !valueGenerated ? 0.6 : 1,
            }}
          >
            {loading === "report-value" ? "Saving..." : "Report Value"}
          </button>
        </div>
      )}

      {!showDispute && status !== "DISPUTED" && (
        <button
          onClick={() => setShowDispute(true)}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Report Issue / Dispute
        </button>
      )}

      {showDispute && (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: 16,
            marginTop: 12,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#991b1b" }}>
            Report Issue
          </h3>
          <textarea
            placeholder="Describe the issue"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleAction("dispute", { reason: disputeReason })}
              disabled={loading === "dispute" || !disputeReason}
              style={{
                padding: "10px 20px",
                background: "#991b1b",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor:
                  loading === "dispute" || !disputeReason
                    ? "not-allowed"
                    : "pointer",
                opacity: loading === "dispute" || !disputeReason ? 0.6 : 1,
              }}
            >
              {loading === "dispute" ? "Submitting..." : "Submit Report"}
            </button>
            <button
              onClick={() => {
                setShowDispute(false);
                setDisputeReason("");
              }}
              style={{
                padding: "10px 20px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

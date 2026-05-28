"use client";

import { useState } from "react";

export default function BuyerDecisionForm({
  sourcingRunId,
  reportId,
}: {
  sourcingRunId: string;
  reportId: string;
}) {
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!decision) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sourcing-runs/${sourcingRunId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          padding: 16,
          background: "#f0fdf4",
          borderRadius: 8,
          color: "#065f46",
          fontSize: 14,
        }}
      >
        Decision submitted successfully. The internal team will see your
        response.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["APPROVE", "REQUEST_MORE_PROOF", "REJECT"].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setDecision(opt)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "2px solid",
              borderColor:
                decision === opt
                  ? opt === "APPROVE"
                    ? "#059669"
                    : opt === "REQUEST_MORE_PROOF"
                      ? "#ca8a04"
                      : "#dc2626"
                  : "#d1d5db",
              background:
                decision === opt
                  ? opt === "APPROVE"
                    ? "#d1fae5"
                    : opt === "REQUEST_MORE_PROOF"
                      ? "#fef3c7"
                      : "#fee2e2"
                  : "white",
              color:
                decision === opt
                  ? opt === "APPROVE"
                    ? "#065f46"
                    : opt === "REQUEST_MORE_PROOF"
                      ? "#92400e"
                      : "#991b1b"
                  : "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {opt.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Optional notes for the internal team..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        style={{
          padding: 8,
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 13,
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
      <button
        type="submit"
        disabled={!decision || loading}
        style={{
          padding: "10px 20px",
          background: decision
            ? decision === "APPROVE"
              ? "#059669"
              : decision === "REQUEST_MORE_PROOF"
                ? "#ca8a04"
                : "#dc2626"
            : "#d1d5db",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: decision && !loading ? "pointer" : "not-allowed",
          opacity: loading ? 0.6 : 1,
          width: "fit-content",
        }}
      >
        {loading ? "Submitting..." : `Submit ${decision || "Decision"}`}
      </button>
      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>
      )}
    </form>
  );
}

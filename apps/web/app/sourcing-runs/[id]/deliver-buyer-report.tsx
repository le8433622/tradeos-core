"use client";

import { useState } from "react";

export default function DeliverBuyerReport({
  sourcingRunId,
}: {
  sourcingRunId: string;
}) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleDeliver(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/buyer/reports/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcingRunId,
          assignedToEmail: email,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed: ${res.status}`);
      }
      setMessage(`Report delivered to ${email}`);
      setEmail("");
      setNotes("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to deliver report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
        background: "white",
      }}
    >
      <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>
        Deliver to Buyer Reviewer
      </h3>
      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
        Send the switch decision report to a buyer reviewer&apos;s inbox. They
        will log in as a BUYER_REVIEWER to view and make a decision.
      </p>
      <form onSubmit={handleDeliver} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          required
          placeholder="buyer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <input
          type="text"
          placeholder="Optional note..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <button
          type="submit"
          disabled={loading || !email}
          style={{
            padding: "8px 16px",
            background: loading || !email ? "#d1d5db" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !email ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Delivering..." : "Deliver Report"}
        </button>
      </form>
      {message && (
        <p style={{ color: "#059669", fontSize: 13, marginTop: 8 }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}

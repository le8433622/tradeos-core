"use client";

import { useState, useCallback } from "react";
import ErrorBanner from "../../components/error-banner";

export function ProposeIntroductionForm() {
  const [buyerOrgId, setBuyerOrgId] = useState("");
  const [sellerOrgId, setSellerOrgId] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [sellerNote, setSellerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);
      setLoading(true);

      try {
        const res = await fetch("/api/introductions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerOrgId,
            sellerOrgId,
            buyerNote,
            sellerNote,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(
            data.message || data.error || "Failed to propose introduction",
          );
        }
        setSuccess(true);
        setBuyerOrgId("");
        setSellerOrgId("");
        setBuyerNote("");
        setSellerNote("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      } finally {
        setLoading(false);
      }
    },
    [buyerOrgId, sellerOrgId, buyerNote, sellerNote],
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 8,
        maxWidth: 520,
        marginBottom: 24,
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15 }}>Propose New Introduction</h3>

      {error && <ErrorBanner message={error} />}
      {success && (
        <p
          style={{
            color: "#166534",
            background: "#dcfce7",
            padding: 8,
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          Introduction proposed successfully. Awaiting buyer/seller approval.
        </p>
      )}

      <input
        name="buyerOrgId"
        placeholder="Buyer Organization ID"
        value={buyerOrgId}
        onChange={(e) => setBuyerOrgId(e.target.value)}
        required
        style={{ padding: 10 }}
      />
      <input
        name="sellerOrgId"
        placeholder="Seller Organization ID"
        value={sellerOrgId}
        onChange={(e) => setSellerOrgId(e.target.value)}
        required
        style={{ padding: 10 }}
      />
      <textarea
        name="buyerNote"
        placeholder="Note for buyer (optional)"
        value={buyerNote}
        onChange={(e) => setBuyerNote(e.target.value)}
        style={{ padding: 10 }}
      />
      <textarea
        name="sellerNote"
        placeholder="Note for seller (optional)"
        value={sellerNote}
        onChange={(e) => setSellerNote(e.target.value)}
        style={{ padding: 10 }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: 12,
          background: "#111827",
          color: "white",
          border: "none",
          borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Proposing..." : "Propose Introduction"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/webhooks/${eventId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        alert(`Retry failed: ${body.error}`);
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      style={{
        padding: "4px 12px",
        background: loading ? "#9ca3af" : "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: 13,
      }}
    >
      {loading ? "Retrying..." : "Retry"}
    </button>
  );
}

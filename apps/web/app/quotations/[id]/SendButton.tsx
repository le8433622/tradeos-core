"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SendButton({
  quotationId,
  status,
}: {
  quotationId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (status !== "DRAFT") return null;

  async function handleSend() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/send`, {
        method: "POST",
      });
      const body = await res.json();
      if (res.ok) {
        setMessage(
          "Approval request created. An admin can approve it from the Approvals page.",
        );
      } else {
        setMessage(`Error: ${body.error}`);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handleSend}
        disabled={loading}
        style={{
          padding: "10px 20px",
          background: loading ? "#9ca3af" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 15,
        }}
      >
        {loading ? "Creating approval request..." : "Send Quotation"}
      </button>
      {message && (
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: message.startsWith("Error") ? "#dc2626" : "#16a34a",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalActions({
  approvalId,
  status,
}: {
  approvalId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handle(action: string) {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/${action}`, {
        method: "POST",
      });
      const body = await res.json();
      if (res.ok) {
        setMessage(
          `${action.charAt(0).toUpperCase() + action.slice(1)} successful.`,
        );
      } else {
        setMessage(`Error: ${body.error}`);
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "PENDING" && (
          <>
            <button
              onClick={() => handle("approve")}
              disabled={loading !== null}
              style={{
                padding: "10px 20px",
                background: loading === "approve" ? "#9ca3af" : "#166534",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading !== null ? "not-allowed" : "pointer",
              }}
            >
              {loading === "approve" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => handle("reject")}
              disabled={loading !== null}
              style={{
                padding: "10px 20px",
                background: loading === "reject" ? "#9ca3af" : "#991b1b",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading !== null ? "not-allowed" : "pointer",
              }}
            >
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </>
        )}
        {status === "APPROVED" && (
          <button
            onClick={() => handle("execute")}
            disabled={loading !== null}
            style={{
              padding: "10px 20px",
              background: loading === "execute" ? "#9ca3af" : "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading !== null ? "not-allowed" : "pointer",
            }}
          >
            {loading === "execute" ? "Executing..." : "Execute Action"}
          </button>
        )}
      </div>
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

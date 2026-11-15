"use client";

import { useState } from "react";

type Membership = {
  organizationId: string;
  organizationName: string;
};

export function ChooseWorkspaceList({
  memberships,
  nextPath,
}: {
  memberships: Membership[];
  nextPath: string;
}) {
  const [pendingOrganizationId, setPendingOrganizationId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");

  async function chooseWorkspace(organizationId: string) {
    setPendingOrganizationId(organizationId);
    setError("");

    try {
      const response = await fetch("/api/user/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          result?.error === "ORGANIZATION_ACCESS_DENIED"
            ? "You no longer have access to that workspace. Refresh and choose another."
            : "We couldn't switch workspaces. Please try again.",
        );
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPendingOrganizationId(null);
    }
  }

  return (
    <div aria-busy={pendingOrganizationId !== null}>
      <div style={{ display: "grid", gap: 12 }}>
        {memberships.map((membership) => {
          const isPending =
            pendingOrganizationId === membership.organizationId;

          return (
            <button
              key={membership.organizationId}
              type="button"
              disabled={pendingOrganizationId !== null}
              onClick={() => chooseWorkspace(membership.organizationId)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "16px 18px",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                background: "white",
                color: "#111827",
                textAlign: "left",
                fontSize: 15,
                fontWeight: 600,
                cursor: pendingOrganizationId !== null ? "wait" : "pointer",
                opacity:
                  pendingOrganizationId !== null && !isPending ? 0.55 : 1,
              }}
            >
              <span>{membership.organizationName || "Workspace"}</span>
              <span style={{ color: "#2563eb", fontSize: 13 }}>
                {isPending ? "Opening..." : "Continue"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" style={{ margin: "16px 0 0", color: "#b91c1c", fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}

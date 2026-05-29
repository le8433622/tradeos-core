"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Membership = {
  organizationId: string;
  organizationName: string;
};

type SessionInfo = {
  organizationId: string;
  organizationName: string;
  memberships: Membership[];
};

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [switching, setSwitching] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/user/memberships");
      if (!res.ok) return;
      const data = await res.json();
      const memberships: Membership[] = data.memberships ?? [];

      const orgId =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("activeOrganizationId="))
          ?.split("=")[1] ?? memberships[0]?.organizationId;

      const current = memberships.find((m) => m.organizationId === orgId);
      setInfo({
        organizationId: orgId,
        organizationName:
          current?.organizationName ?? memberships[0]?.organizationName ?? "",
        memberships,
      });
    } catch {
      // silently fail — no session info to display
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (!info || info.memberships.length <= 1) return null;

  const handleSwitch = async (orgId: string) => {
    if (orgId === info.organizationId) return;
    setSwitching(true);
    try {
      await fetch("/api/user/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      router.refresh();
    } catch {
      // silently fail
    }
    setSwitching(false);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 8px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "white",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
          textAlign: "left",
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {info.organizationName}
        </span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>▼</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {info.memberships.map((m) => (
              <button
                key={m.organizationId}
                onClick={() => handleSwitch(m.organizationId)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background:
                    m.organizationId === info.organizationId
                      ? "#eff6ff"
                      : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight:
                    m.organizationId === info.organizationId ? 600 : 400,
                  color:
                    m.organizationId === info.organizationId
                      ? "#2563eb"
                      : "#374151",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (m.organizationId !== info.organizationId)
                    (e.currentTarget as HTMLElement).style.background =
                      "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  if (m.organizationId !== info.organizationId)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                {m.organizationName}
                {m.organizationId === info.organizationId && (
                  <span style={{ float: "right", color: "#2563eb" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

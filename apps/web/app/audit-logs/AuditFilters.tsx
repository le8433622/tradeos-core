"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuditFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [actionName, setActionName] = useState(
    searchParams.get("action") || "",
  );
  const [riskLevel, setRiskLevel] = useState(searchParams.get("risk") || "");
  const [approved, setApproved] = useState(searchParams.get("approved") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (actionName) params.set("action", actionName);
    if (riskLevel) params.set("risk", riskLevel);
    if (approved) params.set("approved", approved);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    router.push(`/audit-logs?${params.toString()}`);
  }

  function clearFilters() {
    setActionName("");
    setRiskLevel("");
    setApproved("");
    setDateFrom("");
    setDateTo("");
    router.push("/audit-logs");
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "end",
        marginBottom: 20,
        padding: 16,
        background: "#f9fafb",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
      }}
    >
      <div>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
          Action
        </label>
        <input
          value={actionName}
          onChange={(e) => setActionName(e.target.value)}
          placeholder="e.g. crm.createLead"
          style={{ padding: 8, width: 160 }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
          Risk Level
        </label>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All risks</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
          Approved
        </label>
        <select
          value={approved}
          onChange={(e) => setApproved(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All</option>
          <option value="true">Approved</option>
          <option value="false">Blocked / Not approved</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
          From
        </label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={{ padding: 8 }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#6b7280", display: "block" }}>
          To
        </label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={{ padding: 8 }}
        />
      </div>
      <button
        onClick={applyFilters}
        style={{
          padding: "8px 16px",
          background: "#111827",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Apply
      </button>
      <button
        onClick={clearFilters}
        style={{
          padding: "8px 16px",
          background: "#e5e7eb",
          color: "#374151",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </div>
  );
}

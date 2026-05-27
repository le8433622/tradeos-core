"use client";

import { useState } from "react";

const ORG_TYPES = [
  { value: "ASSOCIATION", label: "Association" },
  { value: "IMPORTER", label: "Importer" },
  { value: "EXPORTER", label: "Exporter" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "SERVICE", label: "Service" },
  { value: "OTHER", label: "Other" },
];

export function OrgProfileForm({
  org,
  user,
}: {
  org: { id: string; name: string; type: string; country: string };
  user: { name: string | null; email: string };
}) {
  const [name, setName] = useState(org.name);
  const [type, setType] = useState(org.type);
  const [country, setCountry] = useState(org.country);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName: name, type, country }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Update failed");
      setLoading(false);
      return;
    }

    setMessage("Organization updated");
    setLoading(false);
  }

  const input: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Your Account</h2>
        <dl style={{ margin: 0, display: "grid", gap: 8, fontSize: 14 }}>
          <div><dt style={{ fontWeight: 600, display: "inline" }}>Name:</dt> <dd style={{ display: "inline", margin: 0 }}>{user.name ?? "—"}</dd></div>
          <div><dt style={{ fontWeight: 600, display: "inline" }}>Email:</dt> <dd style={{ display: "inline", margin: 0 }}>{user.email}</dd></div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Organization</h2>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Country
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={input}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving..." : "Save changes"}
        </button>

        {message && <p style={{ color: "#16a34a", fontSize: 14, margin: 0 }}>{message}</p>}
        {error && <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>}
      </form>
    </div>
  );
}
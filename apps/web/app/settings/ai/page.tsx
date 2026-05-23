"use client";

import { useEffect, useState } from "react";

type Settings = {
  aiMonthlyBudget: number | null;
  aiMonthSpend: number;
};

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [aiMonthlyBudget, setAiMonthlyBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setAiMonthlyBudget(data.aiMonthlyBudget?.toString() ?? "");
      })
      .catch((err) => {
        setError("Failed to load AI settings");
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiMonthlyBudget: aiMonthlyBudget ? parseFloat(aiMonthlyBudget) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save");
      } else {
        setSaved("Saved");
        const updated = await res.json();
        setSettings((s) => (s ? { ...s, ...updated } : s));
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>AI Settings</h1>
      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Monthly AI Budget</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
          Max monthly spend on LLM calls. 0 or empty = unlimited. When
          exhausted, AI falls back to keyword detection.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            AI Monthly Budget (USD)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={aiMonthlyBudget}
            onChange={(e) => setAiMonthlyBudget(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
            }}
            placeholder="e.g. 50"
          />
        </div>
        {settings && settings.aiMonthSpend > 0 && (
          <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
            Current MTD spend:{" "}
            <strong>${settings.aiMonthSpend.toFixed(2)}</strong>
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "#111827",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 16,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span style={{ color: "#059669", marginLeft: 12, fontSize: 14 }}>
            {saved}
          </span>
        )}
        {error && (
          <span style={{ color: "#dc2626", marginLeft: 12, fontSize: 14 }}>
            {error}
          </span>
        )}
      </section>
    </div>
  );
}

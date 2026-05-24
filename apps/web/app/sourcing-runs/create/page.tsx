"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateSourcingRunPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [requirement, setRequirement] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [sourceCountry, setSourceCountry] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [riskLevel, setRiskLevel] = useState("low");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!requirement.trim()) errors.requirement = "Requirement is required";
    if (title.length > 512) errors.title = "Title must be under 512 characters";
    if (requirement.length > 16384)
      errors.requirement = "Requirement must be under 16384 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sourcing-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          requirement: requirement.trim(),
          targetCountry: targetCountry.trim() || undefined,
          sourceCountry: sourceCountry.trim() || undefined,
          productCategory: productCategory.trim() || undefined,
          quantity: quantity.trim() || undefined,
          budget: budget.trim() || undefined,
          currency: currency || undefined,
          riskLevel: riskLevel || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || err.message || "Failed to create sourcing run");
      } else {
        const data = await res.json();
        router.push(`/sourcing-runs/${data.run.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif", maxWidth: 640 }}>
      <a
        href="/sourcing-runs"
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing runs
      </a>

      <h1 style={{ marginTop: 16, marginBottom: 24 }}>Create Sourcing Run</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
            Title <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${fieldErrors.title ? "#dc2626" : "#d1d5db"}`,
              borderRadius: 8,
              fontSize: 16,
            }}
            placeholder="e.g. Office Chair Sourcing Q3"
          />
          {fieldErrors.title && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.title}</p>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
            Requirement <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${fieldErrors.requirement ? "#dc2626" : "#d1d5db"}`,
              borderRadius: 8,
              fontSize: 16,
              resize: "vertical",
            }}
            placeholder="Describe the product or service you need to source..."
          />
          {fieldErrors.requirement && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>{fieldErrors.requirement}</p>
          )}
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Target Country
            </label>
            <input
              value={targetCountry}
              onChange={(e) => setTargetCountry(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. Vietnam"
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Source Country
            </label>
            <input
              value={sourceCountry}
              onChange={(e) => setSourceCountry(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. China"
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Product Category
            </label>
            <input
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. Furniture"
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Quantity
            </label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. 500 units"
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 24 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Budget
            </label>
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
              placeholder="e.g. 25000"
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="VND">VND</option>
              <option value="CNY">CNY</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              Risk Level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#dc2626",
              fontSize: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
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
            {saving ? "Creating..." : "Create Sourcing Run"}
          </button>
          <a
            href="/sourcing-runs"
            style={{
              padding: "10px 20px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              color: "#374151",
              textDecoration: "none",
              fontSize: 16,
              display: "inline-block",
            }}
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

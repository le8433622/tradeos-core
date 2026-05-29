"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ParsedEvidence = {
  sourceType: string;
  productName?: string;
  supplierName?: string;
  price?: number;
  currency?: string;
  unit?: string;
  quantity?: number;
  originCountry?: string;
  landedCost?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  evidenceQuality: string;
  evidenceQualityScore: number;
  missingProofFlags: string[];
  confidence: Record<string, string>;
  rawEvidenceRef: string;
};

type FieldState = {
  label: string;
  key: string;
  value: string | undefined;
  confidence: string;
};

export default function EvidenceIntake({
  sourcingRunId,
}: {
  sourcingRunId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedEvidence | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState("ALTERNATIVE_QUOTE");

  const fields: FieldState[] = parsed
    ? [
        {
          label: "Product",
          key: "productName",
          value: parsed.productName,
          confidence: parsed.confidence.productName ?? "UNKNOWN",
        },
        {
          label: "Supplier",
          key: "supplierName",
          value: parsed.supplierName,
          confidence: parsed.confidence.supplierName ?? "UNKNOWN",
        },
        {
          label: "Price",
          key: "price",
          value:
            parsed.price != null
              ? `${parsed.currency ?? ""} ${parsed.price}${parsed.unit ? `/${parsed.unit}` : ""}`
              : undefined,
          confidence: parsed.confidence.price ?? "UNKNOWN",
        },
        {
          label: "Quantity",
          key: "quantity",
          value:
            parsed.quantity != null
              ? `${parsed.quantity} ${parsed.unit ?? ""}`
              : undefined,
          confidence: parsed.confidence.quantity ?? "UNKNOWN",
        },
        {
          label: "Origin",
          key: "originCountry",
          value: parsed.originCountry,
          confidence: parsed.confidence.originCountry ?? "UNKNOWN",
        },
        {
          label: "Landed Cost",
          key: "landedCost",
          value:
            parsed.landedCost != null ? `USD ${parsed.landedCost}` : undefined,
          confidence: parsed.confidence.landedCost ?? "UNKNOWN",
        },
        {
          label: "Payment Terms",
          key: "paymentTerms",
          value: parsed.paymentTerms,
          confidence: parsed.confidence.paymentTerms ?? "UNKNOWN",
        },
        {
          label: "Delivery Terms",
          key: "deliveryTerms",
          value: parsed.deliveryTerms,
          confidence: parsed.confidence.deliveryTerms ?? "UNKNOWN",
        },
      ]
    : [];

  const confidenceColor = (c: string) => {
    if (c === "HIGH") return "#059669";
    if (c === "MEDIUM") return "#d97706";
    if (c === "LOW") return "#dc2626";
    return "#9ca3af";
  };

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    setSaved(false);
    try {
      const res = await fetch("/api/evidence/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Parse failed");
      }
      const data: ParsedEvidence = await res.json();
      setParsed(data);
      setTitle(data.productName ?? data.supplierName ?? "Manual evidence");
      if (data.evidenceQuality.includes("QUOTE"))
        setEvidenceType("ALTERNATIVE_QUOTE");
      else if (data.evidenceQuality.includes("INVOICE"))
        setEvidenceType("CURRENT_SUPPLIER_INVOICE");
      else if (data.evidenceQuality.includes("PAID"))
        setEvidenceType("PAYMENT_PROOF");
      else setEvidenceType("ALTERNATIVE_QUOTE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!parsed || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const content = [
        parsed.productName ? `Product: ${parsed.productName}` : null,
        parsed.supplierName ? `Supplier: ${parsed.supplierName}` : null,
        parsed.price != null
          ? `Price: ${parsed.currency ?? ""} ${parsed.price}${parsed.unit ? `/${parsed.unit}` : ""}`
          : null,
        parsed.quantity != null
          ? `Quantity: ${parsed.quantity} ${parsed.unit ?? ""}`
          : null,
        parsed.originCountry ? `Origin: ${parsed.originCountry}` : null,
        parsed.landedCost != null
          ? `Landed cost: USD ${parsed.landedCost}`
          : null,
        parsed.paymentTerms ? `Payment: ${parsed.paymentTerms}` : null,
        parsed.deliveryTerms ? `Delivery: ${parsed.deliveryTerms}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/evidence/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcingRunId,
          evidenceType,
          title: title.trim(),
          description: `Parsed from manual text. Quality: ${parsed.evidenceQuality} (${parsed.evidenceQualityScore}/100). Missing: ${parsed.missingProofFlags.join(", ") || "none"}`,
          content,
          metadata: {
            parsedEvidence: parsed,
            rawText: text.trim(),
            parsedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setSaved(true);
      setText("");
      setParsed(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        marginTop: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        background: "#fafafa",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>
        Evidence Intake
      </h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a quote, invoice text, chat message, or any trade evidence..."
        rows={4}
        style={{
          width: "100%",
          padding: 12,
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "monospace",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          style={{
            padding: "8px 20px",
            background: loading ? "#9ca3af" : "#111827",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Parsing..." : "Parse"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      {parsed && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#e0e7ff",
                color: "#4338ca",
                fontWeight: 600,
              }}
            >
              {parsed.evidenceQuality} ({parsed.evidenceQualityScore}/100)
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {fields.map((f) => (
              <div
                key={f.key}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  opacity: f.value ? 1 : 0.5,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    {f.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: confidenceColor(f.confidence),
                      fontWeight: 600,
                    }}
                  >
                    {f.confidence}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#111827" }}>
                  {f.value || "—"}
                </div>
              </div>
            ))}
          </div>

          {parsed.missingProofFlags.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#dc2626",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                Missing proof flags:
              </p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {parsed.missingProofFlags.map((flag) => (
                  <span
                    key={flag}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#fef2f2",
                      color: "#dc2626",
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Evidence title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                    marginTop: 4,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Evidence type
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  <option value="ALTERNATIVE_QUOTE">Alternative Quote</option>
                  <option value="CURRENT_SUPPLIER_INVOICE">
                    Current Supplier Invoice
                  </option>
                  <option value="MARKET_BENCHMARK">Market Benchmark</option>
                  <option value="CURRENT_SUPPLIER_PRICE_LIST">
                    Price List
                  </option>
                  <option value="PAYMENT_PROOF">Payment Proof</option>
                  <option value="DELIVERY_CONFIRMATION">
                    Delivery Confirmation
                  </option>
                  <option value="SUPPLIER_MESSAGE">Supplier Message</option>
                  <option value="CALL_NOTE">Call Note</option>
                  <option value="OUTCOME_EVIDENCE">Outcome Evidence</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              style={{
                marginTop: 12,
                padding: "10px 24px",
                background: saving ? "#9ca3af" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save as evidence"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

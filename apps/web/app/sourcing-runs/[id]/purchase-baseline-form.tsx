"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PurchaseBaselineForm({
  sourcingRunId,
}: {
  sourcingRunId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [frequency, setFrequency] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [sourceType, setSourceType] = useState("MANUAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!supplierName.trim()) errors.supplierName = "Supplier name is required";
    if (!productDescription.trim())
      errors.productDescription = "Product description is required";
    if (supplierName.length > 256)
      errors.supplierName = "Must be under 256 characters";
    if (productDescription.length > 4096)
      errors.productDescription = "Must be under 4096 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sourcing-runs/${sourcingRunId}/purchase-baseline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName: supplierName.trim(),
            productDescription: productDescription.trim(),
            quantity: quantity.trim() || undefined,
            unit: unit.trim() || undefined,
            unitPrice: unitPrice.trim() || undefined,
            currency: currency || undefined,
            frequency: frequency.trim() || undefined,
            paymentTerms: paymentTerms.trim() || undefined,
            deliveryTerms: deliveryTerms.trim() || undefined,
            leadTime: leadTime.trim() || undefined,
            sourceType: sourceType,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || err.message || "Failed to create baseline");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#111827",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Add Purchase Baseline
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>
        New Purchase Baseline
      </h3>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 4,
            fontSize: 13,
          }}
        >
          Supplier Name <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: `1px solid ${fieldErrors.supplierName ? "#dc2626" : "#d1d5db"}`,
            borderRadius: 8,
            fontSize: 14,
          }}
          placeholder="Current supplier name"
        />
        {fieldErrors.supplierName && (
          <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>
            {fieldErrors.supplierName}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 4,
            fontSize: 13,
          }}
        >
          Product / Service Description{" "}
          <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={2}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: `1px solid ${fieldErrors.productDescription ? "#dc2626" : "#d1d5db"}`,
            borderRadius: 8,
            fontSize: 14,
            resize: "vertical",
          }}
          placeholder="e.g. Kraft paper rolls, 100gsm"
        />
        {fieldErrors.productDescription && (
          <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>
            {fieldErrors.productDescription}
          </p>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr 1fr",
          marginBottom: 12,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
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
              fontSize: 14,
            }}
            placeholder="e.g. 1000"
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Unit
          </label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
            placeholder="e.g. kg, ton, piece"
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Unit Price
          </label>
          <input
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
            placeholder="e.g. 2.50"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr 1fr",
          marginBottom: 12,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
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
              fontSize: 14,
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="VND">VND</option>
            <option value="CNY">CNY</option>
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Frequency
          </label>
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
            placeholder="e.g. monthly, quarterly"
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Source Type
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            <option value="MANUAL">Manual Entry</option>
            <option value="INVOICE">Invoice</option>
            <option value="PRICE_LIST">Price List</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 16,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Payment Terms
          </label>
          <input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
            placeholder="e.g. Net 30"
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 13,
            }}
          >
            Delivery Terms
          </label>
          <input
            value={deliveryTerms}
            onChange={(e) => setDeliveryTerms(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
            }}
            placeholder="e.g. CIF, FOB"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 4,
            fontSize: 13,
          }}
        >
          Lead Time
        </label>
        <input
          value={leadTime}
          onChange={(e) => setLeadTime(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
          }}
          placeholder="e.g. 2 weeks"
        />
      </div>

      {error && (
        <div
          style={{
            color: "#dc2626",
            fontSize: 13,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 12,
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
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 14,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Baseline"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: "8px 16px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            color: "#374151",
            background: "white",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

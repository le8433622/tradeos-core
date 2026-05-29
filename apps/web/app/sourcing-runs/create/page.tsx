"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAIN_CATEGORIES = [
  { value: "overpaying", label: "Overpaying / Price Gap" },
  { value: "unknown_origin_price", label: "Unknown Origin Price" },
  { value: "supplier_trust", label: "Supplier Trust Risk" },
  { value: "quality_uncertainty", label: "Quality Uncertainty" },
  { value: "delivery_uncertainty", label: "Delivery / Logistics Uncertainty" },
  { value: "moq_mismatch", label: "MOQ / Quantity Mismatch" },
  { value: "single_supplier", label: "Dependency on One Supplier" },
  {
    value: "single_platform",
    label: "Dependency on One Platform / Distributor",
  },
  { value: "missing_evidence", label: "Missing Price / Invoice Evidence" },
  { value: "no_authority", label: "No Decision Authority" },
  { value: "no_outcome", label: "No Outcome Visibility" },
];

export default function TradePainIntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [buyer, setBuyer] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [currentSupplier, setCurrentSupplier] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [frequency, setFrequency] = useState("");
  const [quantity, setQuantity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [targetCountry, setTargetCountry] = useState("");
  const [sourceCountry, setSourceCountry] = useState("");
  const [selectedPains, setSelectedPains] = useState<string[]>([]);
  const [painDetail, setPainDetail] = useState("");
  const [hasEvidence, setHasEvidence] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [decisionMakerKnown, setDecisionMakerKnown] = useState("");
  const [decisionMakerNameOrRole, setDecisionMakerNameOrRole] = useState("");
  const [payerKnown, setPayerKnown] = useState("");
  const [payerNameOrRole, setPayerNameOrRole] = useState("");
  const [consequenceOwner, setConsequenceOwner] = useState("");
  const [decisionAuthorityLevel, setDecisionAuthorityLevel] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");

  function togglePain(value: string) {
    setSelectedPains((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }

  function buildRequirement(): string {
    const parts: string[] = [];
    if (buyer) parts.push(`Reported By: ${buyer}`);
    if (buyerContact) parts.push(`Buyer Contact: ${buyerContact}`);
    if (product) parts.push(`Product: ${product}`);
    if (currentSupplier) parts.push(`Current Supplier: ${currentSupplier}`);
    if (currentPrice)
      parts.push(
        `Current Price: ${currency} ${currentPrice}/${unit || "unit"}`,
      );
    if (frequency) parts.push(`Frequency: ${frequency}`);
    if (quantity) parts.push(`Quantity: ${quantity}`);
    if (selectedPains.length > 0) {
      const painLabels = selectedPains
        .map((p) => PAIN_CATEGORIES.find((c) => c.value === p)?.label ?? p)
        .join(", ");
      parts.push(`Pain: ${painLabels}`);
    }
    if (painDetail) parts.push(`Pain Detail: ${painDetail}`);
    if (hasEvidence) parts.push(`Evidence: ${hasEvidence}`);
    if (decisionMakerKnown)
      parts.push(`Decision Maker Known: ${decisionMakerKnown}`);
    if (decisionMakerNameOrRole)
      parts.push(`Decision Maker: ${decisionMakerNameOrRole}`);
    if (payerKnown) parts.push(`Payer Known: ${payerKnown}`);
    if (payerNameOrRole) parts.push(`Payer: ${payerNameOrRole}`);
    if (consequenceOwner) parts.push(`Consequence Owner: ${consequenceOwner}`);
    if (decisionAuthorityLevel)
      parts.push(`Decision Authority Level: ${decisionAuthorityLevel}`);
    if (expectedOutcome) parts.push(`Expected Outcome: ${expectedOutcome}`);
    return parts.join("\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const metadata = {
        painCategories: selectedPains,
        painDetail: painDetail || undefined,
        evidenceSummary: hasEvidence || undefined,
        decisionAuthority:
          decisionAuthorityLevel || decisionMakerNameOrRole || undefined,
        decisionAuthorityLevel: decisionAuthorityLevel || undefined,
        expectedOutcome: expectedOutcome || undefined,
        dependencyFlags: selectedPains.filter((pain) =>
          [
            "single_supplier",
            "single_platform",
            "unknown_origin_price",
          ].includes(pain),
        ),
        reportedBy: buyer || undefined,
        buyerContact: buyerContact || undefined,
        decisionMakerKnown:
          decisionMakerKnown === ""
            ? null
            : decisionMakerKnown === "YES"
              ? true
              : false,
        decisionMakerNameOrRole: decisionMakerNameOrRole || undefined,
        payerKnown:
          payerKnown === "" ? null : payerKnown === "YES" ? true : false,
        payerNameOrRole: payerNameOrRole || undefined,
        consequenceOwner: consequenceOwner || undefined,
      };
      const res = await fetch("/api/sourcing-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${product || "New"} Sourcing — ${currentSupplier || "Unknown Supplier"}`,
          requirement: buildRequirement(),
          targetCountry: targetCountry || undefined,
          sourceCountry: sourceCountry || undefined,
          productCategory: category || undefined,
          quantity: quantity || undefined,
          budget: currentPrice || undefined,
          currency: currency || undefined,
          metadata,
          riskLevel:
            selectedPains.length > 3
              ? "HIGH"
              : selectedPains.length > 1
                ? "MEDIUM"
                : "LOW",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || err.message || "Failed to create");
      } else {
        const data = await res.json();
        router.push(`/sourcing-runs/${data.run.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    marginBottom: 4,
    fontSize: 14,
  };
  const hintStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    margin: "2px 0 6px",
  };

  return (
    <main
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
      }}
    >
      <a
        href="/sourcing-runs"
        style={{ color: "#0070f3", textDecoration: "none", fontSize: 14 }}
      >
        &larr; Back to sourcing runs
      </a>

      <h1 style={{ marginTop: 16, marginBottom: 4 }}>New Trade Case</h1>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
        Step {step} of 3 — Describe the trade situation so we can find the right
        recommendation.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Buyer & Product */}
        {step === 1 && (
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 16px" }}>
                1. Buyer &amp; Product
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Who reported this trade pain?</label>
                <input
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  style={inputStyle}
                  placeholder="Name or role of the person reporting the pain"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Buyer contact</label>
                <input
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                  style={inputStyle}
                  placeholder="Name, role, or email of the buyer contact"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  What product or service are they buying?
                </label>
                <input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Office chairs, Steel coils, Packaging material"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Product category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Furniture, Steel, Packaging"
                />
              </div>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 16px" }}>
                Current Supply
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Who is the current supplier or source?
                </label>
                <input
                  value={currentSupplier}
                  onChange={(e) => setCurrentSupplier(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Company name or distributor"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Current price per unit</label>
                  <input
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unit / pack size</label>
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 1 box, 1 carton, 1 pallet"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <div>
                  <label style={labelStyle}>Purchase frequency</label>
                  <input
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Monthly, Quarterly"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Quantity per order</label>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={nextButtonStyle}
            >
              Next: What hurts?
            </button>
          </div>
        )}

        {/* Step 2: Pain & Evidence */}
        {step === 2 && (
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
                2. What hurts?
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                Select all that apply. This helps us know what to look for.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                {PAIN_CATEGORIES.map((pc) => (
                  <label
                    key={pc.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${selectedPains.includes(pc.value) ? "#2563eb" : "#e5e7eb"}`,
                      background: selectedPains.includes(pc.value)
                        ? "#eff6ff"
                        : "white",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPains.includes(pc.value)}
                      onChange={() => togglePain(pc.value)}
                      style={{ accentColor: "#2563eb" }}
                    />
                    {pc.label}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Describe the pain in detail</label>
                <p style={hintStyle}>
                  What exactly is the problem? How long has it been happening?
                  What have you tried?
                </p>
                <textarea
                  value={painDetail}
                  onChange={(e) => setPainDetail(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="e.g. Current supplier raised price by 15% and we have no alternative quotes"
                />
              </div>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
                Evidence &amp; Authority
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>What evidence do you have?</label>
                <p style={hintStyle}>
                  Invoices, quotes, screenshots, chat records, supplier profiles
                </p>
                <textarea
                  value={hasEvidence}
                  onChange={(e) => setHasEvidence(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="e.g. Current invoice from supplier, one alternative quote from Alibaba"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Is the decision-maker known?</label>
                  <select
                    value={decisionMakerKnown}
                    onChange={(e) => setDecisionMakerKnown(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Unknown</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Decision-maker name or role</label>
                  <input
                    value={decisionMakerNameOrRole}
                    onChange={(e) => setDecisionMakerNameOrRole(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Owner, procurement director"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Is the payer known?</label>
                  <select
                    value={payerKnown}
                    onChange={(e) => setPayerKnown(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Unknown</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payer name or role</label>
                  <input
                    value={payerNameOrRole}
                    onChange={(e) => setPayerNameOrRole(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Company owner, finance team"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Who carries the consequence?</label>
                <input
                  value={consequenceOwner}
                  onChange={(e) => setConsequenceOwner(e.target.value)}
                  style={inputStyle}
                  placeholder="Who bears loss if the decision is wrong?"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Decision authority level</label>
                <select
                  value={decisionAuthorityLevel}
                  onChange={(e) => setDecisionAuthorityLevel(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">UNKNOWN</option>
                  <option value="NO_AUTHORITY">NO_AUTHORITY</option>
                  <option value="INFLUENCER">INFLUENCER</option>
                  <option value="RECOMMENDER">RECOMMENDER</option>
                  <option value="APPROVER">APPROVER</option>
                  <option value="FINAL_DECISION_MAKER">
                    FINAL_DECISION_MAKER
                  </option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  What outcome would reduce the pain?
                </label>
                <textarea
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="e.g. Find 2-3 alternative suppliers with confirmed pricing, or negotiate 10% reduction"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={secondaryButtonStyle}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={nextButtonStyle}
              >
                Next: Confirm &amp; Create
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, margin: "0 0 16px" }}>
                3. Confirm &amp; Create
              </h2>

              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                  marginBottom: 16,
                }}
              >
                {buildRequirement() || "No details entered yet"}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Target Country</label>
                  <input
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Vietnam"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Source Country</label>
                  <input
                    value={sourceCountry}
                    onChange={(e) => setSourceCountry(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. China"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={inputStyle}
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
                  <label style={labelStyle}>Risk Level</label>
                  <input
                    value={
                      selectedPains.length > 3
                        ? "HIGH"
                        : selectedPains.length > 1
                          ? "MEDIUM"
                          : "LOW"
                    }
                    disabled
                    style={{
                      ...inputStyle,
                      background: "#f3f4f6",
                      color: "#6b7280",
                    }}
                  />
                </div>
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
                type="button"
                onClick={() => setStep(2)}
                style={secondaryButtonStyle}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? "#9ca3af" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Creating..." : "Create Trade Case"}
              </button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}

const nextButtonStyle: React.CSSProperties = {
  padding: "10px 24px",
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 24px",
  background: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 15,
  cursor: "pointer",
};

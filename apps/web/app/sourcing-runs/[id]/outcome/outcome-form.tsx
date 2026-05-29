"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OutcomeForm({ runId }: { runId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    buyerAction: "NEGOTIATE",
    actualSupplier: "",
    actualUnitPrice: "",
    actualDeliveryDays: "",
    qualityResult: "",
    disputeOccurred: false,
    reorderOccurred: false,
    buyerSatisfaction: "3",
    learningNote: "",
    moneySaved: "",
    timeSaved: "",
    riskReduced: "UNKNOWN",
    dependencyReduced: "UNKNOWN",
    trustImproved: "UNKNOWN",
    proofImproved: "UNKNOWN",
    buyerUnderstoodReport: "UNKNOWN",
    operatorTimeSpent: "",
    lessonLearned: "",
    failedOutcomeReason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sourcing-runs/${runId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAction: form.buyerAction,
          actualSupplier: form.actualSupplier || undefined,
          actualUnitPrice: form.actualUnitPrice || undefined,
          actualDeliveryDays: form.actualDeliveryDays
            ? Number(form.actualDeliveryDays)
            : undefined,
          qualityResult: form.qualityResult || undefined,
          disputeOccurred: form.disputeOccurred || undefined,
          reorderOccurred: form.reorderOccurred || undefined,
          buyerSatisfaction: form.buyerSatisfaction
            ? Number(form.buyerSatisfaction)
            : undefined,
          learningNote: form.learningNote || undefined,
          moneySaved: form.moneySaved || undefined,
          timeSaved: form.timeSaved || undefined,
          riskReduced: form.riskReduced || undefined,
          dependencyReduced: form.dependencyReduced || undefined,
          trustImproved: form.trustImproved || undefined,
          proofImproved: form.proofImproved || undefined,
          buyerUnderstoodReport: form.buyerUnderstoodReport || undefined,
          operatorTimeSpent: form.operatorTimeSpent || undefined,
          lessonLearned: form.lessonLearned || undefined,
          failedOutcomeReason: form.failedOutcomeReason || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed: ${res.status}`);
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to record outcome");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        marginTop: 16,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          Buyer Action <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select
          value={form.buyerAction}
          onChange={(e) => setForm({ ...form, buyerAction: e.target.value })}
          style={inputStyle}
        >
          <option value="SWITCH">SWITCH</option>
          <option value="NEGOTIATE">NEGOTIATE</option>
          <option value="KEEP">KEEP</option>
          <option value="WAIT">WAIT</option>
          <option value="REQUEST_MORE_PROOF">REQUEST_MORE_PROOF</option>
          <option value="REJECT">REJECT</option>
          <option value="NO_DECISION">NO_DECISION</option>
          <option value="BUYER_DISAPPEARED">BUYER_DISAPPEARED</option>
          <option value="USED_FOR_NEGOTIATION">USED_FOR_NEGOTIATION</option>
          <option value="FAILED_NO_AUTHORITY">FAILED_NO_AUTHORITY</option>
          <option value="FAILED_INSUFFICIENT_TRUST">
            FAILED_INSUFFICIENT_TRUST
          </option>
          <option value="FAILED_MISSING_PROOF">FAILED_MISSING_PROOF</option>
          <option value="FAILED_LOW_URGENCY">FAILED_LOW_URGENCY</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Actual Supplier</label>
        <input
          value={form.actualSupplier}
          onChange={(e) => setForm({ ...form, actualSupplier: e.target.value })}
          placeholder="Supplier name"
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Actual Unit Price</label>
          <input
            value={form.actualUnitPrice}
            onChange={(e) =>
              setForm({ ...form, actualUnitPrice: e.target.value })
            }
            placeholder="e.g. 560"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Actual Delivery Days</label>
          <input
            type="number"
            value={form.actualDeliveryDays}
            onChange={(e) =>
              setForm({ ...form, actualDeliveryDays: e.target.value })
            }
            placeholder="e.g. 30"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Quality Result</label>
        <select
          value={form.qualityResult}
          onChange={(e) => setForm({ ...form, qualityResult: e.target.value })}
          style={inputStyle}
        >
          <option value="">Unknown / not applicable</option>
          <option value="GOOD">GOOD</option>
          <option value="ACCEPTABLE">ACCEPTABLE</option>
          <option value="POOR">POOR</option>
          <option value="DISPUTED">DISPUTED</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            type="checkbox"
            checked={form.disputeOccurred}
            onChange={(e) =>
              setForm({ ...form, disputeOccurred: e.target.checked })
            }
          />
          Dispute occurred
        </label>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            type="checkbox"
            checked={form.reorderOccurred}
            onChange={(e) =>
              setForm({ ...form, reorderOccurred: e.target.checked })
            }
          />
          Re-ordered
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Buyer Satisfaction (1–5)</label>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                setForm({ ...form, buyerSatisfaction: n.toString() })
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border:
                  form.buyerSatisfaction === n.toString()
                    ? "2px solid #2563eb"
                    : "1px solid #d1d5db",
                background:
                  form.buyerSatisfaction === n.toString() ? "#eff6ff" : "#fff",
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 600,
                color:
                  form.buyerSatisfaction === n.toString()
                    ? "#2563eb"
                    : "#374151",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Pain Relief</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 4,
          }}
        >
          <input
            value={form.moneySaved}
            onChange={(e) => setForm({ ...form, moneySaved: e.target.value })}
            placeholder="Money saved"
            style={inputStyle}
          />
          <input
            value={form.timeSaved}
            onChange={(e) => setForm({ ...form, timeSaved: e.target.value })}
            placeholder="Time saved"
            style={inputStyle}
          />
          <input
            value={form.operatorTimeSpent}
            onChange={(e) =>
              setForm({ ...form, operatorTimeSpent: e.target.value })
            }
            placeholder="Operator time spent"
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <SelectField
          label="Risk reduced"
          value={form.riskReduced}
          onChange={(value) => setForm({ ...form, riskReduced: value })}
        />
        <SelectField
          label="Dependency reduced"
          value={form.dependencyReduced}
          onChange={(value) => setForm({ ...form, dependencyReduced: value })}
        />
        <SelectField
          label="Trust improved"
          value={form.trustImproved}
          onChange={(value) => setForm({ ...form, trustImproved: value })}
        />
        <SelectField
          label="Proof improved"
          value={form.proofImproved}
          onChange={(value) => setForm({ ...form, proofImproved: value })}
        />
        <SelectField
          label="Buyer understood"
          value={form.buyerUnderstoodReport}
          onChange={(value) =>
            setForm({ ...form, buyerUnderstoodReport: value })
          }
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Learning Note</label>
        <textarea
          value={form.learningNote}
          onChange={(e) => setForm({ ...form, learningNote: e.target.value })}
          rows={4}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "Arial, sans-serif",
          }}
          placeholder="What went well? What would you do differently?"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Lesson Learned</label>
        <textarea
          value={form.lessonLearned}
          onChange={(e) => setForm({ ...form, lessonLearned: e.target.value })}
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "Arial, sans-serif",
          }}
          placeholder="What should TradeOS learn from this case?"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Failed Outcome Reason</label>
        <textarea
          value={form.failedOutcomeReason}
          onChange={(e) =>
            setForm({ ...form, failedOutcomeReason: e.target.value })
          }
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "Arial, sans-serif",
          }}
          placeholder="Required for no-decision, disappeared, or failed outcomes."
        />
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        style={{
          padding: "12px 32px",
          background: submitting ? "#9ca3af" : "#059669",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: submitting ? "not-allowed" : "pointer",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {submitting ? "Recording..." : "Record Outcome"}
      </button>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      >
        <option value="UNKNOWN">UNKNOWN</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 4,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
};

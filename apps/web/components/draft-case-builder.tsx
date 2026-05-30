"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DraftSuggestion = {
  evidenceItemId: string;
  evidenceTitle: string;
  suggestedTitle: string;
  suggestedProduct: string;
  suggestedSupplier: string;
  suggestedPrice: string;
  suggestedCurrency: string;
  suggestedUnit: string;
  suggestedQuantity: string;
  suggestedOrigin: string;
  suggestedSourceCountry: string;
  suggestedPainCategories: string[];
  suggestedNextStep:
    | "CREATE_CASE_DRAFT"
    | "NEEDS_MORE_EVIDENCE"
    | "NEEDS_SUPPLIER_IDENTITY"
    | "REQUEST_MORE_EVIDENCE"
    | "WAIT";
  suggestedReason: string;
  painFlags: string[];
  dependencyFlags: string[];
  missingProofFlags: string[];
  evidenceQuality: string;
  evidenceQualityScore: number;
  rawText: string;
};

type EvidenceItem = {
  id: string;
  title: string;
  evidenceType: string;
  description: string | null;
  capturedAt: string;
  sourcingRunId: string | null;
};

export default function DraftCaseBuilder({
  evidenceItems,
}: {
  evidenceItems: EvidenceItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSuggestion | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRequirement, setEditRequirement] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const unattached = evidenceItems.filter((e) => !e.sourcingRunId);

  if (unattached.length === 0) return null;

  const handleBuildDraft = async (item: EvidenceItem) => {
    setLoading(item.id);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch(
        `/api/evidence/build-draft?evidenceItemId=${item.id}`,
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to build draft");
      }
      const data: DraftSuggestion = await res.json();
      setDraft(data);
      setEditTitle(data.suggestedTitle);
      setEditRequirement(data.rawText);
      setEditSource(data.suggestedSourceCountry);
      setEditTarget("");
      setEditCategory(data.suggestedProduct);
      setEditQuantity(data.suggestedQuantity);
      setEditBudget(data.suggestedPrice);
      setEditCurrency(data.suggestedCurrency);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build draft failed");
    }
    setLoading(null);
  };

  const handleCreate = async () => {
    if (!draft) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/evidence/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceItemId: draft.evidenceItemId,
          title: editTitle.trim(),
          requirement: editRequirement.trim(),
          sourceCountry: editSource.trim() || undefined,
          targetCountry: editTarget.trim() || undefined,
          productCategory: editCategory.trim() || undefined,
          quantity: editQuantity.trim() || undefined,
          budget: editBudget.trim() || undefined,
          currency: editCurrency || undefined,
          supplierName: draft.suggestedSupplier || undefined,
          painFlags: draft.painFlags,
          dependencyFlags: draft.dependencyFlags,
          suggestedReason: draft.suggestedReason,
          suggestedNextStep: draft.suggestedNextStep,
          overrideReason: overrideReason?.trim() || undefined,
          requiredProof: draft.missingProofFlags,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create failed");
      }
      const { id } = await res.json();
      setDraft(null);
      router.push(`/sourcing-runs/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
    setCreating(false);
  };

  const handleDiscard = () => {
    setDraft(null);
    setError(null);
  };

  const qualityColor = (q: string) => {
    if (q.startsWith("L4") || q.startsWith("L5")) return "#059669";
    if (q.startsWith("L3")) return "#2563eb";
    if (q.startsWith("L2")) return "#d97706";
    return "#dc2626";
  };

  const nextStepColor = (s: string) => {
    if (s === "CREATE_CASE_DRAFT") return "#059669";
    if (s === "NEEDS_MORE_EVIDENCE" || s === "NEEDS_SUPPLIER_IDENTITY")
      return "#dc2626";
    if (s === "REQUEST_MORE_EVIDENCE") return "#d97706";
    return "#6b7280";
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
        Draft Case Builder
      </h3>

      {!draft && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {unattached.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "white",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.evidenceType} ·{" "}
                  {new Date(item.capturedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleBuildDraft(item)}
                disabled={loading === item.id}
                style={{
                  padding: "6px 16px",
                  background: loading === item.id ? "#9ca3af" : "#111827",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: loading === item.id ? "default" : "pointer",
                }}
              >
                {loading === item.id ? "..." : "Build Draft"}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      {draft && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#e0e7ff",
                color: qualityColor(draft.evidenceQuality),
                fontWeight: 600,
              }}
            >
              {draft.evidenceQuality} ({draft.evidenceQualityScore}/100)
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#ecfdf5",
                color: nextStepColor(draft.suggestedNextStep),
                fontWeight: 600,
              }}
            >
              {draft.suggestedNextStep}
            </span>
          </div>

          {/* --- Decision gate --- */}
          {draft.suggestedNextStep === "CREATE_CASE_DRAFT" && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                fontSize: 13,
                color: "#065f46",
              }}
            >
              Evidence quality sufficient. Ready to create sourcing run.
            </div>
          )}

          {draft.suggestedNextStep === "NEEDS_MORE_EVIDENCE" && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                fontSize: 13,
                color: "#991b1b",
              }}
            >
              <strong>Evidence too weak</strong> to create a reliable case. The
              system recommends collecting more evidence before proceeding.
            </div>
          )}

          {draft.suggestedNextStep === "REQUEST_MORE_EVIDENCE" && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 13,
                color: "#92400e",
              }}
            >
              <strong>Missing critical evidence.</strong> The case can be
              created as <strong>PROOF_PENDING</strong>. Required proof:
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                }}
              >
                {draft.missingProofFlags.length > 0
                  ? draft.missingProofFlags.map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "#fef2f2",
                          color: "#dc2626",
                        }}
                      >
                        {f}
                      </span>
                    ))
                  : "Additional evidence needed"}
              </div>
            </div>
          )}

          {draft.suggestedNextStep === "NEEDS_SUPPLIER_IDENTITY" && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                fontSize: 13,
                color: "#991b1b",
              }}
            >
              <strong>Supplier identity missing.</strong> Enter a supplier name
              in the fields below or provide an override reason to proceed
              without supplier identity.
            </div>
          )}

          {draft.suggestedNextStep === "WAIT" && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              Evidence quality is uncertain. The case will be created with{" "}
              <strong>WAIT</strong> status.
            </div>
          )}

          {draft.suggestedReason && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ fontWeight: 600 }}>Trade pain analysis:</strong>{" "}
              {draft.suggestedReason}
            </div>
          )}

          {draft.painFlags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#92400e",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                Pain flags:
              </p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {draft.painFlags.map((flag) => (
                  <span
                    key={flag}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#fffbeb",
                      color: "#92400e",
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {draft.dependencyFlags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#7c3aed",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                Dependency flags:
              </p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {draft.dependencyFlags.map((flag) => (
                  <span
                    key={flag}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#f5f3ff",
                      color: "#7c3aed",
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {draft.missingProofFlags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {draft.missingProofFlags.map((flag) => (
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
          )}

          {draft.suggestedPainCategories.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {draft.suggestedPainCategories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#fefce8",
                    color: "#a16207",
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Title
              </label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
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
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Product Category
              </label>
              <input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
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
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Source Country
              </label>
              <input
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
                placeholder="e.g. Vietnam"
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
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Target Country
              </label>
              <input
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                placeholder="e.g. Singapore"
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
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Quantity
              </label>
              <input
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="e.g. 500 MT"
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
                style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
              >
                Budget / Price
              </label>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <input
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  placeholder="e.g. USD 4,100/MT"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  style={{
                    width: 80,
                    padding: "8px 4px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="VND">VND</option>
                  <option value="EUR">EUR</option>
                  <option value="CNY">CNY</option>
                  <option value="SGD">SGD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              Requirement / Raw Evidence
            </label>
            <textarea
              value={editRequirement}
              onChange={(e) => setEditRequirement(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "monospace",
                marginTop: 4,
                resize: "vertical",
              }}
            />
          </div>

          {(draft.suggestedNextStep === "NEEDS_MORE_EVIDENCE" ||
            draft.suggestedNextStep === "NEEDS_SUPPLIER_IDENTITY") && (
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#991b1b",
                }}
              >
                Override reason (required to proceed)
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder={
                  draft.suggestedNextStep === "NEEDS_MORE_EVIDENCE"
                    ? "Why should this case proceed despite weak evidence?"
                    : "Why should this case proceed without supplier identity?"
                }
                rows={2}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "monospace",
                  marginTop: 4,
                  resize: "vertical",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {(draft.suggestedNextStep === "NEEDS_MORE_EVIDENCE" ||
              draft.suggestedNextStep === "NEEDS_SUPPLIER_IDENTITY") && (
              <button
                onClick={handleCreate}
                disabled={
                  creating ||
                  !editTitle.trim() ||
                  !editRequirement.trim() ||
                  !overrideReason.trim()
                }
                style={{
                  padding: "10px 24px",
                  background:
                    creating || !overrideReason.trim() ? "#9ca3af" : "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor:
                    creating || !overrideReason.trim() ? "default" : "pointer",
                }}
              >
                {creating ? "Creating..." : "Override & Create Sourcing Run"}
              </button>
            )}

            {draft.suggestedNextStep === "REQUEST_MORE_EVIDENCE" && (
              <button
                onClick={handleCreate}
                disabled={
                  creating || !editTitle.trim() || !editRequirement.trim()
                }
                style={{
                  padding: "10px 24px",
                  background: creating ? "#9ca3af" : "#d97706",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Creating..." : "Create as PROOF_PENDING"}
              </button>
            )}

            {draft.suggestedNextStep === "WAIT" && (
              <button
                onClick={handleCreate}
                disabled={
                  creating || !editTitle.trim() || !editRequirement.trim()
                }
                style={{
                  padding: "10px 24px",
                  background: creating ? "#9ca3af" : "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Creating..." : "Create as WAIT"}
              </button>
            )}

            {draft.suggestedNextStep === "CREATE_CASE_DRAFT" && (
              <button
                onClick={handleCreate}
                disabled={
                  creating || !editTitle.trim() || !editRequirement.trim()
                }
                style={{
                  padding: "10px 24px",
                  background: creating ? "#9ca3af" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                }}
              >
                {creating ? "Creating..." : "Create Sourcing Run"}
              </button>
            )}
            <button
              onClick={handleDiscard}
              disabled={creating}
              style={{
                padding: "10px 24px",
                background: "white",
                color: "#6b7280",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontWeight: 600,
                cursor: creating ? "default" : "pointer",
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

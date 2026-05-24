"use client";

import { useEffect, useState } from "react";

type Settings = {
  missedInbound24h: number;
  avgDealValue: number | null;
  conversionRate: number | null;
  plan: string;
};

type BillingMetrics = {
  dimensions: {
    dimension: string;
    usage: number;
    limit: number;
    exceeded: boolean;
  }[];
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  provider: string;
  checkpointId: string;
  invoiceId: string | null;
};

function Skeleton() {
  return (
    <div style={{ maxWidth: 480 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 120,
            background: "#f3f4f6",
            borderRadius: 16,
            marginBottom: 24,
            padding: 24,
          }}
        >
          <div
            style={{
              height: 18,
              width: "40%",
              background: "#e5e7eb",
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              height: 14,
              width: "70%",
              background: "#e5e7eb",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 14,
              width: "50%",
              background: "#e5e7eb",
              borderRadius: 4,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  open,
  currentPlan,
  newPlan,
  onConfirm,
  onCancel,
  saving,
}: {
  open: boolean;
  currentPlan: string;
  newPlan: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (!open) return null;
  const isDowngrade =
    ["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"].indexOf(newPlan) <
    ["FREE", "PILOT", "TEAM", "ASSOCIATION", "ENTERPRISE"].indexOf(currentPlan);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: "90%",
        }}
      >
        <h3 style={{ margin: "0 0 12px" }}>
          {isDowngrade ? "Downgrade plan?" : "Change plan?"}
        </h3>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>
          {isDowngrade
            ? `Downgrading from ${currentPlan} to ${newPlan} may reduce available features and limits. This change takes effect immediately.`
            : `Upgrade from ${currentPlan} to ${newPlan}? Additional charges may apply.`}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              background: isDowngrade ? "#dc2626" : "#111827",
              color: "white",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : isDowngrade ? "Downgrade" : "Upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics | null>(
    null,
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plan, setPlan] = useState("");
  const [pendingPlan, setPendingPlan] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [avgDealValue, setAvgDealValue] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/organization/settings").then((r) => r.json()),
      fetch("/api/organization/billing").then((r) => r.json()),
      fetch("/api/organization/billing/payments").then((r) => r.json()),
    ])
      .then(([settingsData, billingData, paymentsData]) => {
        setSettings(settingsData);
        setPlan(settingsData.plan || "FREE");
        setAvgDealValue(settingsData.avgDealValue?.toString() ?? "");
        setConversionRate(settingsData.conversionRate?.toString() ?? "");
        setBillingMetrics(billingData.metrics);
        setPayments(paymentsData.payments ?? []);
      })
      .catch(() => {
        setError("Failed to load billing data");
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePlanSelect = (value: string) => {
    setPendingPlan(value);
    if (value !== plan) {
      setShowConfirm(true);
    }
  };

  const handlePlanConfirm = async () => {
    setShowConfirm(false);
    setPlan(pendingPlan);
  };

  const handlePlanCancel = () => {
    setShowConfirm(false);
    setPendingPlan(plan);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          avgDealValue: avgDealValue ? parseFloat(avgDealValue) : null,
          conversionRate: conversionRate ? parseFloat(conversionRate) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        const msg =
          err.error === "ENTITLEMENT_EXCEEDED"
            ? "Your current plan limit has been reached. Contact support to upgrade."
            : err.error === "PERMISSION_DENIED" || err.error === "ROLE_ACCESS_DENIED"
              ? "You do not have permission to change billing settings."
              : err.error === "INVALID_PLAN"
                ? "The selected plan is not valid."
                : err.error || "Failed to save";
        setError(msg);
      } else {
        setSaved("Saved");
        const updated = await res.json();
        setSettings((s) => (s ? { ...s, ...updated } : s));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton />;

  const dealVal = parseFloat(avgDealValue) || 0;
  const convRate = parseFloat(conversionRate) || 0;
  const inboundPerHour = settings ? settings.missedInbound24h / 24 : 0;
  const outageHours = 2;
  const missedDeals = inboundPerHour * outageHours * convRate;
  const estimatedLoss = missedDeals * dealVal;

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Billing</h1>

      <ConfirmDialog
        open={showConfirm}
        currentPlan={plan}
        newPlan={pendingPlan}
        onConfirm={handlePlanConfirm}
        onCancel={handlePlanCancel}
        saving={saving}
      />

      <section
        style={{
          background: "#f0f9ff",
          border: "1px solid #93c5fd",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: "#1e40af" }}>
          Plan & Usage
        </h2>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Plan
          </label>
          <select
            value={plan}
            onChange={(e) => handlePlanSelect(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
            }}
          >
            <option value="FREE">Free</option>
            <option value="PILOT">Pilot</option>
            <option value="TEAM">Team</option>
            <option value="ASSOCIATION">Association</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
          {pendingPlan && pendingPlan !== plan && (
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Plan change to {pendingPlan} is pending confirmation.
            </p>
          )}
        </div>
        {billingMetrics && (
          <div>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
              Current usage vs plan limits:
            </p>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr 1fr",
                fontSize: 14,
              }}
            >
              {billingMetrics.dimensions.map((d) => (
                <div
                  key={d.dimension}
                  style={{
                    padding: "12px",
                    background: d.exceeded ? "#fef2f2" : "#f9fafb",
                    borderRadius: 8,
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {d.dimension.replace(/_/g, " ")}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      color: d.exceeded ? "#dc2626" : "#111827",
                    }}
                  >
                    {d.usage} / {d.limit === Infinity ? "∞" : d.limit}
                  </p>
                  {d.exceeded && (
                    <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>
                      Upgrade to increase limit
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <a
                href="/api/organization/billing/export"
                target="_blank"
                style={{
                  color: "#2563eb",
                  fontSize: 14,
                  textDecoration: "underline",
                }}
              >
                Export usage report (JSON)
              </a>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                Full billing data for finance: user seats, inbound messages, AI
                usage, snapshots, quotations, integrations.
              </p>
            </div>
          </div>
        )}
      </section>

      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Payment History</h2>
        {payments.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            No payments recorded yet.
          </p>
        ) : (
          <div style={{ fontSize: 14 }}>
            {payments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <strong>
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </strong>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>
                    {new Date(p.paidAt).toLocaleDateString()} &middot;{" "}
                    {p.provider}
                  </p>
                </div>
                <span
                  style={{
                    color: p.status === "COMPLETED" ? "#059669" : "#d97706",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Invoices</h2>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>
          Invoice history will be available here once billing is processed
          through a payment provider.
        </p>
      </section>

      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Disaster Recovery Inputs</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
          These values help estimate the financial impact of a system outage.
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
            Average Deal Value (USD)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={avgDealValue}
            onChange={(e) => setAvgDealValue(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
            }}
            placeholder="e.g. 50000"
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Conversion Rate (0.0 – 1.0)
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
            }}
            placeholder="e.g. 0.05"
          />
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            Fraction of inbound messages that become a deal. Defaults to 0 if
            empty.
          </p>
        </div>
      </section>

      <section
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: "#92400e" }}>
          Outage Impact Estimate
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          Estimated cost of a {outageHours}-hour outage based on your settings
          and recent traffic.
        </p>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr",
            fontSize: 14,
          }}
        >
          <div>
            <span style={{ color: "#6b7280" }}>Inbound messages / day</span>
            <br />
            <strong>{settings?.missedInbound24h ?? "?"}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Inbound / hour</span>
            <br />
            <strong>{inboundPerHour.toFixed(1)}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Conversion rate</span>
            <br />
            <strong>
              {convRate > 0 ? `${(convRate * 100).toFixed(1)}%` : "Not set"}
            </strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Avg deal value</span>
            <br />
            <strong>
              {dealVal > 0 ? `$${dealVal.toLocaleString()}` : "Not set"}
            </strong>
          </div>
        </div>
        <div
          style={{
            marginTop: 20,
            background: "#fff7ed",
            border: "1px solid #f97316",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#92400e", fontSize: 14, margin: 0 }}>
            Estimated loss for {outageHours}-hour outage
          </p>
          <strong
            style={{
              fontSize: 32,
              color: "#9a3412",
              display: "block",
              marginTop: 4,
            }}
          >
            {dealVal > 0 && convRate > 0
              ? `~$${Math.round(estimatedLoss).toLocaleString()}`
              : "Set values above"}
          </strong>
          <p style={{ color: "#92400e", fontSize: 13, marginTop: 8 }}>
            {missedDeals > 0
              ? `Based on ~${missedDeals.toFixed(1)} missed deal(s)`
              : ""}
          </p>
        </div>
      </section>

      <section
        style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: "#166534" }}>
          Recovery Readiness
        </h2>
        <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
          <div>
            <span style={{ color: "#6b7280" }}>
              RPO (Recovery Point Objective)
            </span>
            <br />
            <strong>5 minutes</strong>
            <br />
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Supabase continuous WAL archiving to S3. Max 5 min data loss.
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ color: "#6b7280" }}>
              RTO (Recovery Time Objective)
            </span>
            <br />
            <strong>2 hours</strong>
            <br />
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Time to restore from backup and verify data integrity.
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ color: "#6b7280" }}>Backup schedule</span>
            <br />
            <strong>Continuous</strong>
            <br />
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Supabase Point-in-Time Recovery. Automatic daily snapshots + WAL
              archive.
            </span>
          </div>
        </div>
        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#9ca3af",
            fontStyle: "italic",
          }}
        >
          See docs/17_DISASTER_RECOVERY.md for full runbook.
        </p>
      </section>

      <div style={{ marginTop: 24, maxWidth: 480 }}>
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
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span style={{ color: "#059669", marginLeft: 12, fontSize: 14 }}>
            {saved}
          </span>
        )}
        {error && (
          <div
            style={{
              color: "#dc2626",
              marginTop: 8,
              fontSize: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

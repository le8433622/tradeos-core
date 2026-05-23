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

export default function BillingSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics | null>(
    null,
  );
  const [plan, setPlan] = useState("");
  const [avgDealValue, setAvgDealValue] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setPlan(data.plan || "FREE");
        setAvgDealValue(data.avgDealValue?.toString() ?? "");
        setConversionRate(data.conversionRate?.toString() ?? "");
      })
      .catch((err) => {
        setError("Failed to load billing data");
      });
    fetch("/api/organization/billing")
      .then((r) => r.json())
      .then((data: { metrics: BillingMetrics }) =>
        setBillingMetrics(data.metrics),
      )
      .catch((err) => {
        setError("Failed to load billing metrics");
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
          plan,
          avgDealValue: avgDealValue ? parseFloat(avgDealValue) : null,
          conversionRate: conversionRate ? parseFloat(conversionRate) : null,
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

  const dealVal = parseFloat(avgDealValue) || 0;
  const convRate = parseFloat(conversionRate) || 0;
  const inboundPerHour = settings ? settings.missedInbound24h / 24 : 0;
  const outageHours = 2;
  const missedDeals = inboundPerHour * outageHours * convRate;
  const estimatedLoss = missedDeals * dealVal;

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Billing</h1>

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
            onChange={(e) => setPlan(e.target.value)}
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
          <span style={{ color: "#dc2626", marginLeft: 12, fontSize: 14 }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

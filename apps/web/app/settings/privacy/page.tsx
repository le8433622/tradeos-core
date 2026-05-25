"use client";

import { useEffect, useState } from "react";

export default function PrivacySettingsPage() {
  const [introductionsEnabled, setIntroductionsEnabled] = useState(false);
  const [legalHold, setLegalHold] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/organization/settings")
      .then((r) => r.json())
      .then((data: { introductionsEnabled: boolean; mfaRequired: boolean }) => {
        setIntroductionsEnabled(data.introductionsEnabled ?? false);
        setLoaded(true);
      })
      .catch(() => {
        setError("Failed to load privacy settings");
        setLoaded(true);
      });
  }, []);

  const handleIntroToggle = async () => {
    const next = !introductionsEnabled;
    setIntroductionsEnabled(next);
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introductionsEnabled: next }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save");
        setIntroductionsEnabled(!next);
      } else {
        setSaved("Saved");
      }
    } catch {
      setError("Network error");
      setIntroductionsEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  const handleLegalHoldToggle = async () => {
    if (
      legalHold &&
      !confirm("Disable legal hold? Data anonymization will be allowed again.")
    )
      return;
    const next = !legalHold;
    setLegalHold(next);
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/privacy/legal-hold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalHold: next }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to update legal hold");
        setLegalHold(!next);
      } else {
        setSaved(next ? "Legal hold enabled" : "Legal hold disabled");
      }
    } catch {
      setError("Network error");
      setLegalHold(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: "0 0 24px" }}>Privacy</h1>

      <section
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: "#991b1b" }}>
          Legal Hold
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          When enabled, data anonymization is blocked to preserve evidence for
          legal or compliance purposes. Only OWNER can toggle this.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            style={{
              position: "relative",
              display: "inline-block",
              width: 48,
              height: 26,
            }}
          >
            <input
              type="checkbox"
              checked={legalHold}
              onChange={handleLegalHoldToggle}
              disabled={!loaded}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 26,
                transition: "0.3s",
                background: legalHold ? "#dc2626" : "#d1d5db",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: 20,
                  width: 20,
                  left: legalHold ? 24 : 3,
                  bottom: 3,
                  background: "white",
                  borderRadius: "50%",
                  transition: "0.3s",
                }}
              />
            </span>
          </label>
          <span style={{ fontSize: 14 }}>
            {legalHold ? "Active" : "Inactive"}
          </span>
        </div>
      </section>

      <section
        style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0, color: "#166534" }}>
          Data Export
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          Download all your organization data for portability or backup.
        </p>
        <a
          href="/api/privacy/export"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "8px 20px",
            background: "#111827",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Export My Data
        </a>
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
          Partner Introductions
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          When enabled, your organization can receive introduction requests from
          association operators for buyer/seller matching.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            style={{
              position: "relative",
              display: "inline-block",
              width: 48,
              height: 26,
            }}
          >
            <input
              type="checkbox"
              checked={introductionsEnabled}
              onChange={handleIntroToggle}
              disabled={!loaded}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 26,
                transition: "0.3s",
                background: introductionsEnabled ? "#22c55e" : "#d1d5db",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: 20,
                  width: 20,
                  left: introductionsEnabled ? 24 : 3,
                  bottom: 3,
                  background: "white",
                  borderRadius: "50%",
                  transition: "0.3s",
                }}
              />
            </span>
          </label>
          <span style={{ fontSize: 14 }}>
            {introductionsEnabled ? "Enabled" : "Disabled"}
          </span>
          <a
            href="/introductions"
            style={{
              color: "#2563eb",
              fontSize: 14,
              marginLeft: "auto",
              textDecoration: "none",
            }}
          >
            View introductions →
          </a>
        </div>
      </section>

      {saved && (
        <p style={{ color: "#059669", fontSize: 14, marginTop: 16 }}>{saved}</p>
      )}
      {error && (
        <p style={{ color: "#dc2626", fontSize: 14, marginTop: 16 }}>{error}</p>
      )}
    </div>
  );
}

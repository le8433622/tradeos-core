"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("Vietnam");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function check() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        router.replace("/login");
        return;
      }
      setEmail(session.user.email);
      setOrgName(session.user.user_metadata?.orgName ?? "");
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, country, industry }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Setup failed");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  if (checking) {
    return (
      <main style={{ padding: 32, fontFamily: "system-ui, sans-serif", textAlign: "center", background: "#f9fafb", minHeight: "100vh" }}>
        <p style={{ color: "#6b7280" }}>Checking session...</p>
      </main>
    );
  }

  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 32,
    maxWidth: 480,
    width: "100%",
  };

  const input: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        padding: 32,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f9fafb",
      }}
    >
      <div style={card}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Set up your organization</h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
          Signed in as <strong>{email}</strong>. Create your workspace to get started.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Organization name
            </label>
            <input
              type="text"
              required
              placeholder="Your company or team name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={input}
            >
              <option value="Vietnam">Vietnam</option>
              <option value="Singapore">Singapore</option>
              <option value="Thailand">Thailand</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Philippines">Philippines</option>
              <option value="Cambodia">Cambodia</option>
              <option value="Laos">Laos</option>
              <option value="Myanmar">Myanmar</option>
              <option value="China">China</option>
              <option value="Japan">Japan</option>
              <option value="South Korea">South Korea</option>
              <option value="United States">United States</option>
              <option value="Australia">Australia</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Industry
            </label>
            <input
              type="text"
              placeholder="e.g. Agriculture, Manufacturing, Retail"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              style={input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginTop: 8,
            }}
          >
            {loading ? "Setting up..." : "Create workspace"}
          </button>
        </form>

        {error && <p style={{ color: "#dc2626", fontSize: 14, margin: "12px 0 0" }}>{error}</p>}
      </div>
    </main>
  );
}
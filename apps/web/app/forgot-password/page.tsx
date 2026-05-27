"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Check your email for the password reset link.");
    }
  }

  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: "100%",
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
        <h1 style={{ fontSize: 22, margin: "0 0 24px" }}>Reset password</h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
          Enter your email and we will send you a reset link.
        </p>

        <form onSubmit={handleReset} style={{ display: "grid", gap: 16 }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
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
            }}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message && <p style={{ color: "#16a34a", fontSize: 14, margin: "12px 0 0" }}>{message}</p>}
        {error && <p style={{ color: "#dc2626", fontSize: 14, margin: "12px 0 0" }}>{error}</p>}

        <p style={{ marginTop: 24, fontSize: 13 }}>
          <a href="/login" style={{ color: "#2563eb" }}>
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}
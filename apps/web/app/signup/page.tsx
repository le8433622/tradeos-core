"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, orgName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Account created! Check your email to confirm.");
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
        <h1 style={{ fontSize: 22, margin: "0 0 24px" }}>Create your account</h1>

        <form onSubmit={handleSignup} style={{ display: "grid", gap: 16 }}>
          <input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />
          <input
            type="text"
            required
            placeholder="Organization name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            style={input}
          />
          <input
            type="password"
            required
            placeholder="Password (min 6 chars)"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {message && <p style={{ color: "#16a34a", fontSize: 14, margin: "12px 0 0" }}>{message}</p>}
        {error && <p style={{ color: "#dc2626", fontSize: 14, margin: "12px 0 0" }}>{error}</p>}

        <p style={{ marginTop: 24, fontSize: 13 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#2563eb" }}>
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
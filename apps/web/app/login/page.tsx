"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

type Mode = "magic-link" | "password";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
  }, []);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createSupabaseBrowserClient();
    const redirectTo = new URL(`${window.location.origin}/auth/callback`);
    if (nextPath !== "/") {
      redirectTo.searchParams.set("next", nextPath);
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo.toString() },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMessage("Magic link sent! Check your email.");
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      window.location.href = nextPath;
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

  const btn: React.CSSProperties = {
    padding: "10px 20px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
  };

  const tabBtn = (m: Mode): React.CSSProperties => ({
    padding: "8px 16px",
    border: "none",
    background: mode === m ? "#111827" : "#f3f4f6",
    color: mode === m ? "white" : "#374151",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  });

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
        <h1 style={{ fontSize: 22, margin: "0 0 24px" }}>Sign in to TradeOS</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button
            style={tabBtn("magic-link")}
            onClick={() => setMode("magic-link")}
          >
            Magic Link
          </button>
          <button
            style={tabBtn("password")}
            onClick={() => setMode("password")}
          >
            Password
          </button>
        </div>

        {mode === "magic-link" ? (
          <form onSubmit={handleMagicLink} style={{ display: "grid", gap: 16 }}>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
            <button type="submit" disabled={loading} style={btn}>
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handlePasswordSignIn}
            style={{ display: "grid", gap: 16 }}
          >
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />
            <button type="submit" disabled={loading} style={btn}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {message && (
          <p style={{ color: "#16a34a", fontSize: 14, margin: "12px 0 0" }}>
            {message}
          </p>
        )}
        {error && (
          <p style={{ color: "#dc2626", fontSize: 14, margin: "12px 0 0" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 24, fontSize: 13 }}>
          {mode === "password" && (
            <a href="/forgot-password" style={{ color: "#2563eb" }}>
              Forgot password?
            </a>
          )}
          <a href="/signup" style={{ color: "#2563eb" }}>
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}

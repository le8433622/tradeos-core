"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? error.message : "Magic link sent. Check your email.");
  }

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>TradeOS Login</h1>
      <form
        onSubmit={submit}
        style={{ display: "grid", gap: 12, maxWidth: 420 }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          style={{ padding: 12 }}
        />
        <button type="submit" style={{ padding: 12 }}>
          Send magic link
        </button>
      </form>
      <p>{status}</p>
      <a href="/">Back</a>
    </main>
  );
}

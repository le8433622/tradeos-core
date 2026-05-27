"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) {
      setError("Current password is incorrect");
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const input: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>Change Password</h2>

      <input
        type="password"
        required
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        style={input}
      />
      <input
        type="password"
        required
        placeholder="New password (min 6 chars)"
        minLength={6}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        style={input}
      />
      <input
        type="password"
        required
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? "Changing..." : "Change password"}
      </button>

      {message && <p style={{ color: "#16a34a", fontSize: 14, margin: 0 }}>{message}</p>}
      {error && <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>}
    </form>
  );
}
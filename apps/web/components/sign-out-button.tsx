"use client";

import { createSupabaseBrowserClient } from "../lib/supabase-browser";

export function SignOutButton() {
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={signOut}
      style={{
        width: "100%",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 14,
        color: "#dc2626",
        background: "transparent",
        border: "1px solid #fca5a5",
        cursor: "pointer",
        textAlign: "left",
        fontWeight: 500,
      }}
    >
      Sign out
    </button>
  );
}

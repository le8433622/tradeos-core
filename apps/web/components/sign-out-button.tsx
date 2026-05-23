"use client";

import { createSupabaseBrowserClient } from "../lib/supabase-browser";

export function SignOutButton() {
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button onClick={signOut} style={{ padding: 10 }}>
      Sign out
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    async function run() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const next = new URLSearchParams(window.location.search).get("next");
        const nextPath =
          next?.startsWith("/") && !next.startsWith("//") ? next : "/";
        window.location.href = nextPath;
        return;
      }
      setStatus("No active session found. Please try login again.");
    }
    run();
  }, []);

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>TradeOS Auth</h1>
      <p>{status}</p>
      <a href="/login">Back to login</a>
    </main>
  );
}

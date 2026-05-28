"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

function parseTokensFromHash(): {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
} {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.substring(1);
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const ei = params.get("expires_in");
  return {
    access_token: params.get("access_token") || undefined,
    refresh_token: params.get("refresh_token") || undefined,
    expires_in: ei ? parseInt(ei, 10) : undefined,
  };
}

function getNextPath(): string {
  const urlNext = new URLSearchParams(window.location.search).get("next");
  if (urlNext?.startsWith("/") && !urlNext.startsWith("//")) return urlNext;
  const stored = sessionStorage.getItem("authCallbackNext");
  if (stored) {
    sessionStorage.removeItem("authCallbackNext");
    return stored;
  }
  return "/";
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    async function run() {
      const tokens = parseTokensFromHash();
      if (!tokens.access_token || !tokens.refresh_token) {
        setStatus("No active session found. Please try login again.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        setStatus("Session error: " + error.message);
        return;
      }
      const nextPath = getNextPath();
      window.location.href = nextPath;
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

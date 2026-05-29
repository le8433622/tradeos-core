"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

function getHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.substring(1));
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
      const supabase = createSupabaseBrowserClient();
      const params = getHashParams();

      // PKCE flow: Supabase returns a code in the hash
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("Session error: " + error.message);
          return;
        }
        const nextPath = getNextPath();
        window.location.href = nextPath;
        return;
      }

      // Implicit flow: access_token and refresh_token in hash
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus("Session error: " + error.message);
          return;
        }
        const nextPath = getNextPath();
        window.location.href = nextPath;
        return;
      }

      // No tokens found — maybe session already established
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        const nextPath = getNextPath();
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

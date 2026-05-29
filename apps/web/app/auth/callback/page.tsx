"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";

function getNextPath(): string {
  if (typeof window === "undefined") return "/";
  const urlNext = new URLSearchParams(window.location.search).get("next");
  if (urlNext?.startsWith("/") && !urlNext.startsWith("//")) return urlNext;
  const stored = sessionStorage.getItem("authCallbackNext");
  if (stored) {
    sessionStorage.removeItem("authCallbackNext");
    return stored;
  }
  return "/";
}

function parseUrlTokens(): { code?: string; accessToken?: string; refreshToken?: string } {
  if (typeof window === "undefined") return {};
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const query = new URLSearchParams(window.location.search.substring(1));
  return {
    code: hash.get("code") || query.get("code") || undefined,
    accessToken: hash.get("access_token") || query.get("access_token") || undefined,
    refreshToken: hash.get("refresh_token") || query.get("refresh_token") || undefined,
  };
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing sign in...");
  const [debug, setDebug] = useState("");

  useEffect(() => {
    async function run() {
      const supabase = createSupabaseBrowserClient();
      const tokens = parseUrlTokens();
      const fullUrl = window.location.href;
      const hashRaw = window.location.hash;
      const queryRaw = window.location.search;
      setDebug(`URL: ${fullUrl}\nHash: ${hashRaw}\nQuery: ${queryRaw}\nCode: ${tokens.code}\nAT: ${tokens.accessToken}\nRT: ${tokens.refreshToken}`);

      // PKCE flow
      if (tokens.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(tokens.code);
        if (error) {
          setStatus("Session error: " + error.message);
          return;
        }
        window.location.href = getNextPath();
        return;
      }

      // Implicit flow
      if (tokens.accessToken && tokens.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (error) {
          setStatus("Session error: " + error.message);
          return;
        }
        window.location.href = getNextPath();
        return;
      }

      // Fallback: check if already signed in
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        window.location.href = getNextPath();
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
      <pre style={{ fontSize: 12, background: "#f5f5f5", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{debug}</pre>
      <a href="/login">Back to login</a>
    </main>
  );
}

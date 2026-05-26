import { createClient } from "@supabase/supabase-js";

const AUTH_COOKIE_PREFIX = "sb-ulnjanlaehfmxurreibj-auth-token";
const AUTH_PROJECT_REF = "ulnjanlaehfmxurreibj";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { url, key };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  const { url, key } = getSupabaseEnv();
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(
      `Supabase sign-in failed for ${email}: ${error?.message ?? "no session"}`,
    );
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export function sessionToAuthCookies(
  session: AuthSession,
  domain: string,
): { name: string; value: string; domain: string; path: string }[] {
  const value = JSON.stringify({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  return [
    {
      name: AUTH_COOKIE_PREFIX,
      value,
      domain,
      path: "/",
    },
  ];
}

export function demoAuthCookies(
  email: string,
  domain: string,
): { name: string; value: string; domain: string; path: string }[] {
  return [
    {
      name: "x-demo-auth-email",
      value: email,
      domain,
      path: "/",
    },
  ];
}

export async function trySupabaseAuth(
  email: string,
): Promise<AuthSession | null> {
  const password = process.env.E2E_USER_PASSWORD;
  if (!password) return null;
  return signInWithPassword(email, password);
}

export function getAuthCookieDomain(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

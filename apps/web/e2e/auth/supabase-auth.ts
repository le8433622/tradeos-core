import type { BrowserContext } from "@playwright/test";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Sign in via the server-side /api/e2e/login endpoint.
 * The response includes Set-Cookie headers that the server client
 * (@supabase/ssr) sets in the exact cookie format it expects.
 */
export async function e2eLogin(
  context: BrowserContext,
  baseUrl: string,
  email: string,
  password: string,
): Promise<void> {
  const resp = await context.request.post(`${baseUrl}/api/e2e/login`, {
    data: { email, password },
  });
  if (!resp.ok()) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(
      `E2E login failed (${resp.status()}): ${body.message ?? body.error ?? "unknown"}`,
    );
  }

  const setCookieHeaders = resp
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);

  const cookies = parseSetCookieHeaders(setCookieHeaders, baseUrl);
  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }
}

function parseSetCookieHeaders(
  headers: string[],
  baseUrl: string,
): { name: string; value: string; domain: string; path: string }[] {
  const domain = getAuthCookieDomain(baseUrl);
  const result: {
    name: string;
    value: string;
    domain: string;
    path: string;
  }[] = [];

  for (const header of headers) {
    const semi = header.indexOf(";");
    const nv = semi >= 0 ? header.slice(0, semi) : header;
    const eq = nv.indexOf("=");
    if (eq <= 0) continue;
    const name = nv.slice(0, eq).trim();
    const value = nv.slice(eq + 1).trim();
    result.push({ name, value, domain, path: "/" });
  }

  return result;
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

export function getAuthCookieDomain(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

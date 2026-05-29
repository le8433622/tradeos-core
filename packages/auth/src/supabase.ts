import { createClient } from "@supabase/supabase-js";

export function getBearerToken(request: Request) {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export function getAccessTokenFromRequestCookies(
  request: Request,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  function safeDecode(s: string) {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }

  // Parse cookies per RFC 6265: handle quoted values containing ';' and '='
  const all: Record<string, string> = {};
  let i = 0;
  const len = cookieHeader.length;
  while (i < len) {
    // Skip whitespace
    while (i < len && (cookieHeader[i] === " " || cookieHeader[i] === "\t"))
      i++;
    if (i >= len) break;

    // Read name until '='
    let nameEnd = i;
    while (nameEnd < len && cookieHeader[nameEnd] !== "=") nameEnd++;
    const name = cookieHeader.slice(i, nameEnd).trim();
    i = nameEnd + 1; // skip '='
    if (!name) continue;

    // Read value — handle quoted string
    let value: string;
    if (i < len && cookieHeader[i] === '"') {
      i++; // skip opening '"'
      const quoteEnd = cookieHeader.indexOf('"', i);
      value =
        quoteEnd === -1
          ? cookieHeader.slice(i)
          : cookieHeader.slice(i, quoteEnd);
      i = quoteEnd === -1 ? len : quoteEnd + 2; // skip closing '"' and possible ';'
    } else {
      const semi = cookieHeader.indexOf(";", i);
      value = semi === -1 ? cookieHeader.slice(i) : cookieHeader.slice(i, semi);
      i = semi === -1 ? len : semi + 1;
    }

    all[name] = safeDecode(value);
  }

  // Match cookie name patterns:
  //   sb-{ref}-auth-token          (single cookie)
  //   sb-{ref}-auth-token-{n}      (legacy chunked, n = 0, 1, 2...)
  //   sb-{ref}-auth-token.{n}      (SSR v0.5.2+ chunked, n = 0, 1, 2...)
  const AUTH_PATTERN = /^sb-.+-auth-token(?:[.-]\d+)?$/;
  const CHUNK_SUFFIX = /[.-](\d+)$/;

  const authCookies = Object.keys(all).filter((k) => AUTH_PATTERN.test(k));
  if (authCookies.length === 0) return null;

  // Derive expected cookie prefix from env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)/);
  const expectedPrefix = refMatch ? `sb-${refMatch[1]}-auth-token` : null;

  // Group by base name (strip chunk suffix)
  const groups = new Map<string, { index: number; key: string }[]>();
  for (const key of authCookies) {
    const chunkMatch = key.match(CHUNK_SUFFIX);
    const base = chunkMatch ? key.slice(0, chunkMatch.index) : key;
    const index = chunkMatch ? parseInt(chunkMatch[1], 10) : -1;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push({ index, key });
  }

  // Prefer group matching the expected Supabase project ref; otherwise take the first
  const keys = Array.from(groups.keys());
  const preferredBase =
    (expectedPrefix && keys.find((k) => k === expectedPrefix)) ?? keys[0];
  const bestGroup = groups.get(preferredBase)!;
  bestGroup.sort((a, b) => a.index - b.index);
  const value = bestGroup.map((e) => all[e.key]).join("");

  if (!value) return null;
  return parseSupabaseSession(value);
}

const BASE64_PREFIX = "base64-";

function parseSupabaseSession(raw: string): string | null {
  // @supabase/ssr stores session as JSON: { access_token, refresh_token, ... }
  // In some configurations it's base64(JSON(...))
  // In SSR v0.5.2+ it's base64-{base64url(JSON(session))}
  // In raw cookie form it can be a direct JWT

  // Try inputs: raw, strip base64- prefix + base64url decode, legacy base64 decode
  const inputs: (string | null)[] = [raw];
  if (raw.startsWith(BASE64_PREFIX)) {
    const b64url = raw.slice(BASE64_PREFIX.length);
    inputs.push(tryBase64URLDecode(b64url));
  }
  inputs.push(tryBase64Decode(raw));

  for (const input of inputs) {
    if (input === null) continue;
    try {
      const parsed = JSON.parse(input);
      if (parsed.access_token) return parsed.access_token;
      if (
        Array.isArray(parsed) &&
        parsed.length >= 1 &&
        typeof parsed[0] === "string"
      ) {
        return parsed[0];
      }
    } catch {
      /* next format */
    }
  }

  if (raw.split(".").length === 3) return raw;
  const decoded = tryBase64Decode(raw);
  if (decoded && decoded.split(".").length === 3) return decoded;

  return null;
}

function tryBase64URLDecode(s: string): string | null {
  try {
    const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function tryBase64Decode(s: string): string | null {
  try {
    return Buffer.from(s, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export async function getSupabaseUserFromToken(accessToken: string) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("SUPABASE_AUTH_ENV_MISSING");
  }

  const supabase = createClient(supabaseUrl, publishableKey);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user?.email) {
    throw new Error("SUPABASE_TOKEN_INVALID");
  }

  return data.user;
}

export function getSessionAal(accessToken: string): "aal1" | "aal2" {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return "aal1";
    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8"),
    );
    return decoded.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

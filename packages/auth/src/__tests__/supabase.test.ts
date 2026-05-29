import { describe, expect, it } from "vitest";
import { getAccessTokenFromRequestCookies, getSessionAal } from "../supabase";

function makeJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".");
}

describe("Supabase request auth helpers", () => {
  it("extracts AAL2 from JWT payload", () => {
    expect(getSessionAal(makeJwt({ aal: "aal2" }))).toBe("aal2");
    expect(getSessionAal(makeJwt({ aal: "aal1" }))).toBe("aal1");
    expect(getSessionAal("not-a-jwt")).toBe("aal1");
  });

  it("extracts access token from Supabase JSON auth cookie", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const token = makeJwt({ aal: "aal2" });
    const value = encodeURIComponent(
      JSON.stringify({ access_token: token, refresh_token: "refresh" }),
    );
    const request = new Request("https://tradeos.local", {
      headers: { cookie: `sb-projectref-auth-token=${value}` },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBe(token);
  });

  it("extracts access token from base64-{base64url(JSON)} cookie (SSR v0.5.2 format)", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const token = makeJwt({ aal: "aal2" });
    const json = JSON.stringify({
      access_token: token,
      refresh_token: "refresh",
    });
    const b64url = Buffer.from(json).toString("base64url");
    const request = new Request("https://tradeos.local", {
      headers: { cookie: `sb-projectref-auth-token=base64-${b64url}` },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBe(token);
  });

  it("reassembles dot-chunked Supabase auth cookies (SSR v0.5.2 format)", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const token = makeJwt({ aal: "aal2" });
    const json = JSON.stringify({
      access_token: token,
      refresh_token: "refresh",
    });
    const b64url = Buffer.from(json).toString("base64url");
    const prefix = "base64-";
    const chunk0 = b64url.slice(0, 20);
    const chunk1 = b64url.slice(20);
    const request = new Request("https://tradeos.local", {
      headers: {
        cookie: [
          `sb-other-auth-token=ignored`,
          `sb-projectref-auth-token.0=${prefix}${chunk0}`,
          `sb-projectref-auth-token.1=${chunk1}`,
        ].join("; "),
      },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBe(token);
  });

  it("reassembles legacy dash-chunked Supabase auth cookies for backward compat", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const token = makeJwt({ aal: "aal2" });
    const encoded = Buffer.from(
      JSON.stringify([token, "refresh-token"]),
    ).toString("base64");
    const request = new Request("https://tradeos.local", {
      headers: {
        cookie: [
          "sb-other-auth-token=ignore.me.jwt",
          `sb-projectref-auth-token-1=${encoded.slice(20)}`,
          `sb-projectref-auth-token-0=${encoded.slice(0, 20)}`,
        ].join("; "),
      },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBe(token);
  });

  it("prefers cookie matching configured Supabase project ref over others", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const token = makeJwt({ aal: "aal1" });
    const value = encodeURIComponent(
      JSON.stringify({ access_token: token, refresh_token: "refresh" }),
    );
    const request = new Request("https://tradeos.local", {
      headers: {
        cookie: [
          `sb-wrong-ref-auth-token=${value}wrong_stuff`,
          `sb-projectref-auth-token=${value}`,
        ].join("; "),
      },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBe(token);
  });

  it("returns null for malformed cookie value", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const request = new Request("https://tradeos.local", {
      headers: { cookie: "sb-projectref-auth-token=not-json-not-jwt" },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBeNull();
  });

  it("returns null when no cookie header is present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const request = new Request("https://tradeos.local");
    expect(getAccessTokenFromRequestCookies(request)).toBeNull();
  });

  it("returns null for base64- prefix with invalid base64url content", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projectref.supabase.co";
    const request = new Request("https://tradeos.local", {
      headers: {
        cookie: "sb-projectref-auth-token=base64-!!!invalid!!!base64",
      },
    });

    expect(getAccessTokenFromRequestCookies(request)).toBeNull();
  });
});

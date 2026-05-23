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

  it("reassembles chunked Supabase auth cookies for the configured project ref", () => {
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
});

import { test as base, type BrowserContext } from "@playwright/test";
import { getE2EConfig } from "../env";
import {
  e2eLogin,
  demoAuthCookies,
  getAuthCookieDomain,
} from "./supabase-auth";

export type AuthMode =
  | { type: "supabase"; email: string; password: string }
  | { type: "demo"; email: string };

export async function applyAuth(
  context: BrowserContext,
  baseUrl: string,
  mode: AuthMode,
): Promise<void> {
  if (mode.type === "supabase") {
    await e2eLogin(context, baseUrl, mode.email, mode.password);
  } else {
    const domain = getAuthCookieDomain(baseUrl);
    const cookies = demoAuthCookies(mode.email, domain);
    await context.addCookies(cookies);
  }
}

export function getDefaultAuthMode(): AuthMode {
  const cfg = getE2EConfig();
  if (!cfg.enabled) {
    return { type: "demo", email: cfg.email };
  }
  if (cfg.password) {
    return { type: "supabase", email: cfg.email, password: cfg.password };
  }
  return { type: "demo", email: cfg.email };
}

export const test = base;

export { expect } from "@playwright/test";

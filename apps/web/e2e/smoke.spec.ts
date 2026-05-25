import { test, expect } from "@playwright/test";
import { getE2EConfig } from "./env";

const cfg = getE2EConfig();

test.describe("Smoke — Protected Pages", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping E2E");

  test("Dashboard loads with demo auth", async ({ page }) => {
    await page.goto(cfg.baseUrl);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
    const html = await page.locator("html").innerText();
    expect(html.length).toBeGreaterThan(50);
  });

  test("Sourcing runs list loads", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
  });

  test("Leads list loads", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/leads`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
  });

  test("Settings profile loads", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/settings/profile`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
  });
});

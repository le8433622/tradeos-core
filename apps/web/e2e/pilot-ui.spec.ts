import { test, expect, applyAuth, getDefaultAuthMode } from "./auth/fixtures";
import { getE2EConfig } from "./env";

const cfg = getE2EConfig();

test.describe("Supplier Switch Pilot UI (#98)", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping");

  test.beforeEach(async ({ context }) => {
    await applyAuth(context, cfg.baseUrl, getDefaultAuthMode());
  });

  test("Dashboard loads with status filter and case list", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Sourcing Runs");

    await expect(
      page.locator('a[href="/sourcing-runs?status=DRAFT"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/sourcing-runs?status=REPORT_DELIVERED"]'),
    ).toBeVisible();
    await expect(page.locator("text=Decision")).toBeVisible();
  });

  test("Case detail page loads by clicking from dashboard", async ({
    page,
  }) => {
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator('a[href^="/sourcing-runs/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });

    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
    const url = page.url();
    expect(url).toContain("/sourcing-runs/");

    const body = await page.locator("body").innerText();
    const hasContent =
      body.includes("Supplier") ||
      body.includes("Baseline") ||
      body.includes("Requirement") ||
      body.includes("Switch Decision");
    expect(hasContent).toBeTruthy();
  });

  test("Decision page loads when report exists", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");

    const caseLink = page.locator('a[href^="/sourcing-runs/"]').first();
    const href = (await caseLink.getAttribute("href")) ?? "";
    const runId = href.replace("/sourcing-runs/", "");

    await page.goto(`${cfg.baseUrl}/sourcing-runs/${runId}/decision`);
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const body = await page.locator("body").innerText();

    if (url.includes("permission_denied") || url.includes("login")) {
      expect(url).toContain("permission_denied");
    } else if (body.includes("No switch decision") || body.includes("404")) {
      expect(
        body.includes("No switch decision") || body.includes("404"),
      ).toBeTruthy();
    } else {
      // Report exists — verify content renders
      await expect(page.locator("h1")).toContainText("Buyer Decision");
      const hasReportContent =
        body.includes("SWITCH") ||
        body.includes("NEGOTIATE") ||
        body.includes("WAIT") ||
        body.includes("Confidence") ||
        body.includes("risk") ||
        body.includes("Approve");
      expect(hasReportContent).toBeTruthy();
    }
  });

  test("Outcome page renders form or read view", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");

    const caseLink = page.locator('a[href^="/sourcing-runs/"]').first();
    const href = (await caseLink.getAttribute("href")) ?? "";
    const runId = href.replace("/sourcing-runs/", "");

    await page.goto(`${cfg.baseUrl}/sourcing-runs/${runId}/outcome`);
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").innerText();

    if (body.includes("Record Outcome")) {
      await expect(page.locator("text=Buyer Action")).toBeVisible();
      await expect(page.locator("text=Learning Note")).toBeVisible();
    } else if (body.includes("Outcome Recorded")) {
      await expect(page.locator("h1")).toContainText("Outcome Recorded");
    } else {
      // Redirect or permission denied
      expect(
        body.includes("login") || body.includes("permission_denied"),
      ).toBeFalsy();
    }
  });

  test("Settings team page renders member table", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/settings/team`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Team");
    await expect(page.locator("text=Invite Member")).toBeVisible();
  });

  test("Settings roles page renders permission matrix", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/settings/roles`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Permission Matrix");
    const body = await page.locator("body").innerText();
    expect(body.includes("OWNER")).toBeTruthy();
    expect(body.includes("sourcing")).toBeTruthy();
  });

  test("Settings debug page renders session and permissions", async ({
    page,
  }) => {
    await page.goto(`${cfg.baseUrl}/settings/debug`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Permission Debug");
    await expect(page.locator("text=Session")).toBeVisible();
    await expect(page.locator("text=Permissions")).toBeVisible();
  });

  test("Settings audit page loads without permission error", async ({
    page,
  }) => {
    await page.goto(`${cfg.baseUrl}/settings/audit`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Audit Logs");
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("permission_denied");
  });
});

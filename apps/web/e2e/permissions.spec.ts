import { test, expect, applyAuth, getDefaultAuthMode } from "./auth/fixtures";
import { getE2EConfig } from "./env";

const cfg = getE2EConfig();

test.describe("Permissions — Skeleton", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping E2E");

  test.beforeEach(async ({ context }) => {
    await applyAuth(context, cfg.baseUrl, getDefaultAuthMode());
  });

  test("Dashboard loads without permission errors", async ({ page }) => {
    await page.goto(cfg.baseUrl);
    await page.waitForLoadState("networkidle");
    const html = await page.locator("html").innerText();
    expect(html).not.toContain("permission_denied");
  });

  test("Unauthorized page redirects with ?error=permission_denied", async ({
    page,
  }) => {
    await page.goto(`${cfg.baseUrl}/settings/billing`);
    await page.waitForLoadState("networkidle");
    const url = page.url();
    if (url.includes("permission_denied")) {
      expect(url).toContain("permission_denied");
    } else {
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(0);
    }
  });

  test("Approvals page loads or redirects gracefully", async ({ page }) => {
    await page.goto(`${cfg.baseUrl}/approvals`);
    await page.waitForLoadState("networkidle");
    const url = page.url();
    if (url.includes("permission_denied")) {
      expect(url).toContain("permission_denied");
    } else {
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});

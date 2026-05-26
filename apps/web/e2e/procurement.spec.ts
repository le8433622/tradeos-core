import { test, expect, applyAuth, getDefaultAuthMode } from "./auth/fixtures";
import { getE2EConfig } from "./env";

const cfg = getE2EConfig();

test.describe("Procurement — Skeleton", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping E2E");

  test.beforeEach(async ({ context }) => {
    await applyAuth(context, cfg.baseUrl, getDefaultAuthMode());
  });

  test("Happy path: sourcing run list → detail", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: "e2e-screenshots/procurement-list.png",
      fullPage: true,
    });
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test("Navigate to sourcing run detail (first in list)", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const links = page.locator("a[href*='/sourcing-runs/']");
    const count = await links.count();
    if (count > 0) {
      await links.first().click();
      await page.waitForLoadState("networkidle");
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(0);
    } else {
      console.log("[e2e] No sourcing run links found — list may be empty");
    }
  });
});

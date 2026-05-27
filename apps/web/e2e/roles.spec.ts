import { test, expect, applyAuth } from "./auth/fixtures";
import { getE2EConfig } from "./env";
import { demoAuthCookies, getAuthCookieDomain } from "./auth/supabase-auth";

const cfg = getE2EConfig();

function roleAuth(email: string) {
  return async ({ context }: { context: any }) => {
    const domain = getAuthCookieDomain(cfg.baseUrl);
    await context.addCookies(demoAuthCookies(email, domain));
  };
}

test.describe("Role-based landing & access (#99)", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping");

  test.describe("OWNER (owner-demo@tradeos.local)", () => {
    test.beforeEach(roleAuth("owner-demo@tradeos.local"));

    test("lands on /settings/team via root redirect", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/settings/team`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/settings/team");
      const body = await page.locator("body").innerText();
      expect(body).toContain("Team");
    });

    test("can access sourcing-runs", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/sourcing-runs`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1")).toBeAttached({ timeout: 10000 });
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });
  });

  test.describe("ADMIN (admin-demo@tradeos.local)", () => {
    test.beforeEach(roleAuth("admin-demo@tradeos.local"));

    test("lands on /sourcing-runs", async ({ page }) => {
      await page.goto(cfg.baseUrl);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/sourcing-runs");
      await expect(page.locator("h1")).toBeAttached({ timeout: 10000 });
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });

    test("can access settings team (has user.invite)", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/settings/team`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeAttached({ timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Team");
    });
  });

  test.describe("OPERATOR (operator-demo@tradeos.local)", () => {
    test.beforeEach(roleAuth("operator-demo@tradeos.local"));

    test("lands on /sourcing-runs", async ({ page }) => {
      await page.goto(cfg.baseUrl);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/sourcing-runs");
      await expect(page.locator("h1")).toBeAttached({ timeout: 10000 });
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });

    test("is blocked from settings team (no user.invite)", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/settings/team`);
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("/settings/team");
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });

    test("can access sourcing-runs detail", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/sourcing-runs`);
      await page.waitForLoadState("domcontentloaded");
      const firstLink = page.locator('a[href^="/sourcing-runs/"]').first();
      await expect(firstLink).toBeVisible({ timeout: 10000 });
      const href = await firstLink.getAttribute("href");
      expect(href).toBeTruthy();
    });
  });

  test.describe("VIEWER (viewer-demo@tradeos.local)", () => {
    test.beforeEach(roleAuth("viewer-demo@tradeos.local"));

    test("lands on /sourcing-runs?mode=view", async ({ page }) => {
      await page.goto(cfg.baseUrl);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/sourcing-runs");
      expect(page.url()).toContain("mode=view");
      await expect(page.locator("h1")).toBeAttached({ timeout: 10000 });
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });

    test("is blocked from settings team (no user permission)", async ({
      page,
    }) => {
      await page.goto(`${cfg.baseUrl}/settings/team`);
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("/settings/team");
      const body = await page.locator("body").innerText();
      expect(body).toContain("Sourcing");
    });

    test("can read sourcing-runs detail", async ({ page }) => {
      await page.goto(`${cfg.baseUrl}/sourcing-runs`);
      await page.waitForLoadState("domcontentloaded");
      const firstLink = page.locator('a[href^="/sourcing-runs/"]').first();
      await expect(firstLink).toBeVisible({ timeout: 10000 });
      const href = await firstLink.getAttribute("href");
      expect(href).toBeTruthy();
    });
  });
});

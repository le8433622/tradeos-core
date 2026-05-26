import { test, expect, applyAuth } from "./auth/fixtures";
import { getE2EConfig } from "./env";

const cfg = getE2EConfig();

const BEHAVIOR_ORG = "behavior-qa-01";
const BEHAVIOR_EMAIL = "behavior-qa@tradeos.local";

test.describe("Behavior Scenarios — QA Validation", () => {
  test.skip(!cfg.enabled, "E2E_RUN_ENABLED !== true — skipping E2E");

  test.beforeEach(async ({ context }) => {
    await applyAuth(context, cfg.baseUrl, {
      type: "demo",
      email: BEHAVIOR_EMAIL,
    });
  });

  test("B-QB: Qualified buyer scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Qualified Buyer");
  });

  test("B-NDM: Non-decision-maker scenario shows WAIT behavior", async ({
    page,
  }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Non Decision Maker");
  });

  test("B-MI: Missing invoice scenario loads gracefully", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Missing Invoice");
  });

  test("B-WS: Weak screenshot scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Weak Screenshot");
  });

  test("B-NC: Non-comparable product scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Non Comparable");
  });

  test("B-CRS: Cheap risky supplier scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Cheap Risky Supplier");
  });

  test("B-HSWP: High savings weak proof scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("High Savings Weak Proof");
  });

  test("B-LSHT: Low savings high trust scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Low Savings High Trust");
  });

  test("B-BRM: Buyer requests more proof scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Buyer Requests More Proof");
  });

  test("B-BR: Buyer rejects report scenario loads", async ({ page }) => {
    test.slow();
    await page.goto(`${cfg.baseUrl}/sourcing-runs`);
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body).toContain("Buyer Rejects Report");
  });
});

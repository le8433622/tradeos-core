import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { getE2EConfig } = await import("./env");
  const cfg = getE2EConfig();

  if (!cfg.enabled) {
    console.log("[e2e] E2E_RUN_ENABLED !== true — skipping global setup");
    return;
  }

  console.log(`[e2e] E2E harness enabled`);
  console.log(`[e2e] Base URL: ${cfg.baseUrl}`);
  console.log(`[e2e] User email: ${cfg.email}`);
  if (cfg.orgId) console.log(`[e2e] Org ID: ${cfg.orgId}`);
  if (cfg.password) {
    console.log(`[e2e] Auth mode: SUPABASE AUTH (password available)`);
  } else {
    console.log(
      `[e2e] Auth mode: DEMO AUTH (set E2E_USER_PASSWORD for real auth)`,
    );
  }
}

export default globalSetup;

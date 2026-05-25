const requiredVars = [] as const;

function missingVars(vars: readonly string[]): string[] {
  return vars.filter((name) => !process.env[name]);
}

export function getE2EConfig() {
  const enabled = process.env.E2E_RUN_ENABLED === "true";

  if (!enabled) {
    return { enabled: false as const };
  }

  const missing = missingVars(requiredVars);
  if (missing.length > 0) {
    console.warn(
      `[e2e] E2E_RUN_ENABLED=true but missing vars: ${missing.join(", ")}. Tests will fail.`,
    );
  }

  return {
    enabled: true as const,
    baseUrl: process.env.E2E_BASE_URL || "http://localhost:3000",
    email: process.env.E2E_USER_EMAIL || "owner@tradeos.local",
    orgId: process.env.E2E_ORG_ID || "demo-org",
  };
}

let validated = false;

const requiredServerVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "JWT_SECRET",
] as const;

const requiredServerVarsProduction = [
  "WEBHOOK_SECRET",
  "WEBHOOK_ENCRYPTION_KEY",
  "APP_URL",
] as const;

function missingVars(vars: readonly string[]): string[] {
  return vars.filter((name) => !process.env[name]);
}

function isBuildContext(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    (process.env.VERCEL_ENV === "preview" ||
      process.env.VERCEL_ENV === "development" ||
      !process.env.VERCEL_ENV)
  );
}

export function validateEnv(): void {
  if (validated) return;

  if (isBuildContext()) {
    console.warn(
      "[env] Build context detected — skipping env validation for build. Runtime will validate.",
    );
    validated = true;
    return;
  }

  if (process.env.NODE_ENV === "production") {
    const missing = missingVars([
      ...requiredServerVars,
      ...requiredServerVarsProduction,
    ]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(", ")}`,
      );
    }

    const demoAuth = process.env.ALLOW_DEMO_AUTH;
    if (demoAuth === "true" || demoAuth === "1") {
      throw new Error("ALLOW_DEMO_AUTH must be false in production");
    }
  } else {
    const missing = missingVars(requiredServerVars);
    if (missing.length > 0) {
      const criticalMissing = missing.filter(
        (v) => !["JWT_SECRET", "DIRECT_URL"].includes(v),
      );
      if (criticalMissing.length > 0) {
        console.warn(
          `Missing development environment variables: ${criticalMissing.join(", ")}`,
        );
      }
    }
  }

  validated = true;
}
